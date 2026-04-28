import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

interface Discrepancy {
  type: 'late_clock_in' | 'early_clock_out' | 'missing_clock_out' | 'overtime' | 'no_show' | 'extra_break'
  severity: 'warning' | 'error'
  message: string
  minutes?: number
}

function timeStr(d: unknown): string | undefined {
  if (d == null) return undefined
  const s = String(d)
  if (/^\d{2}:\d{2}(:\d{2})?/.test(s)) return s.slice(0, 5)
  return s
}

function detectDiscrepancies(
  row: {
    date: string
    clock_in?: string | null
    clock_out?: string | null
  },
  shiftAssignment: { start_time?: string | null; end_time?: string | null } | null
): Discrepancy[] {
  const discrepancies: Discrepancy[] = []

  if (shiftAssignment && !row.clock_in) {
    discrepancies.push({
      type: 'no_show',
      severity: 'error',
      message: 'Scheduled shift but no clock-in recorded',
    })
    return discrepancies
  }

  if (!row.clock_in) return discrepancies

  if (!row.clock_out) {
    discrepancies.push({
      type: 'missing_clock_out',
      severity: 'error',
      message: 'Missing clock-out time',
    })
    return discrepancies
  }

  const dateYmd = row.date.split('T')[0]

  if (shiftAssignment?.start_time && row.clock_in) {
    const st = timeStr(shiftAssignment.start_time) || '09:00'
    const scheduledStart = new Date(`${dateYmd}T${st}:00`)
    const actualStart = new Date(row.clock_in)
    const lateMinutes = Math.floor((actualStart.getTime() - scheduledStart.getTime()) / (1000 * 60))
    if (lateMinutes > 5) {
      discrepancies.push({
        type: 'late_clock_in',
        severity: lateMinutes > 15 ? 'error' : 'warning',
        message: `Clock-in was ${lateMinutes} minutes vs scheduled start`,
        minutes: lateMinutes,
      })
    }
  }

  if (shiftAssignment?.end_time && row.clock_out) {
    const et = timeStr(shiftAssignment.end_time) || '17:00'
    const scheduledEnd = new Date(`${dateYmd}T${et}:00`)
    const actualEnd = new Date(row.clock_out)
    const earlyMinutes = Math.floor((scheduledEnd.getTime() - actualEnd.getTime()) / (1000 * 60))
    if (earlyMinutes > 5) {
      discrepancies.push({
        type: 'early_clock_out',
        severity: earlyMinutes > 30 ? 'error' : 'warning',
        message: `Clock-out was ${earlyMinutes} minutes early vs scheduled end`,
        minutes: earlyMinutes,
      })
    }
  }

  if (shiftAssignment?.start_time && shiftAssignment?.end_time && row.clock_in && row.clock_out) {
    const st = timeStr(shiftAssignment.start_time) || '09:00'
    const et = timeStr(shiftAssignment.end_time) || '17:00'
    const scheduledStart = new Date(`${dateYmd}T${st}:00`)
    const scheduledEnd = new Date(`${dateYmd}T${et}:00`)
    const actualStart = new Date(row.clock_in)
    const actualEnd = new Date(row.clock_out)
    const scheduledHours = (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60)
    const actualHours = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60)
    const overtimeMinutes = Math.floor((actualHours - scheduledHours) * 60)
    if (overtimeMinutes > 15) {
      discrepancies.push({
        type: 'overtime',
        severity: overtimeMinutes > 60 ? 'error' : 'warning',
        message: `Worked ~${overtimeMinutes} minutes longer than scheduled block`,
        minutes: overtimeMinutes,
      })
    }
  }

  return discrepancies
}

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Access denied. Admin or manager role required.' }, { status: 403 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
    }

    const tenantId = tenantContext.tenant_id

    const shiftLogSql = `
      SELECT 
        sl.id,
        'shift_log'::text AS row_source,
        sl.employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        e.employee_code,
        COALESCE(e.department, '') AS department,
        l.name AS location_name,
        (sl.clock_in_time::date)::text AS work_date,
        CASE WHEN sched.start_time IS NOT NULL THEN to_char(sched.start_time, 'HH24:MI') END AS scheduled_start,
        CASE WHEN sched.end_time IS NOT NULL THEN to_char(sched.end_time, 'HH24:MI') END AS scheduled_end,
        sched.template_name AS scheduled_label,
        CASE 
          WHEN sched.start_time IS NOT NULL AND sched.end_time IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (sched.end_time - sched.start_time)) / 3600
          ELSE NULL 
        END AS scheduled_hours,
        sl.clock_in_time AS clock_in,
        sl.clock_out_time AS clock_out,
        COALESCE(
          sl.total_shift_hours,
          CASE WHEN sl.clock_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (sl.clock_out_time - sl.clock_in_time)) / 3600 
            ELSE NULL END
        ) AS actual_hours,
        COALESCE(sl.break_time_used, 0) AS break_hours,
        NULL::text AS approval_status,
        NULL::uuid AS approved_by,
        NULL::timestamptz AS approved_at,
        sl.shift_remarks AS notes
      FROM shift_logs sl
      JOIN employees e ON e.id = sl.employee_id AND e.tenant_id = sl.tenant_id
      LEFT JOIN locations l ON e.location_id = l.id AND l.tenant_id = sl.tenant_id
      LEFT JOIN LATERAL (
        SELECT 
          COALESCE(sa.override_start_time, sa.start_time, st.start_time) AS start_time,
          COALESCE(sa.override_end_time, sa.end_time, st.end_time) AS end_time,
          COALESCE(sa.override_name, st.name) AS template_name
        FROM shift_assignments sa
        LEFT JOIN shift_templates st ON st.id = sa.template_id AND st.tenant_id = sa.tenant_id
        WHERE sa.tenant_id = sl.tenant_id
          AND sa.employee_id = sl.employee_id
          AND (
            sa.id = sl.shift_assignment_id
            OR (sl.shift_assignment_id IS NULL AND sa.date = (sl.clock_in_time::date))
          )
        ORDER BY 
          CASE WHEN sa.id = sl.shift_assignment_id THEN 0 ELSE 1 END,
          sa.is_published DESC NULLS LAST,
          sa.updated_at DESC NULLS LAST
        LIMIT 1
      ) sched ON true
      WHERE sl.tenant_id = $1
        AND (sl.clock_in_time::date) BETWEEN $2::date AND $3::date
    `

    const scheduleOnlySql = `
      SELECT 
        sa.id,
        'schedule_only'::text AS row_source,
        sa.employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        e.employee_code,
        COALESCE(e.department, '') AS department,
        l.name AS location_name,
        sa.date::text AS work_date,
        to_char(COALESCE(sa.override_start_time, sa.start_time, st.start_time), 'HH24:MI') AS scheduled_start,
        to_char(COALESCE(sa.override_end_time, sa.end_time, st.end_time), 'HH24:MI') AS scheduled_end,
        COALESCE(sa.override_name, st.name) AS scheduled_label,
        CASE 
          WHEN COALESCE(sa.override_start_time, sa.start_time, st.start_time) IS NOT NULL 
           AND COALESCE(sa.override_end_time, sa.end_time, st.end_time) IS NOT NULL
          THEN EXTRACT(EPOCH FROM (
            COALESCE(sa.override_end_time, sa.end_time, st.end_time) 
            - COALESCE(sa.override_start_time, sa.start_time, st.start_time)
          )) / 3600
          ELSE NULL 
        END AS scheduled_hours,
        NULL::timestamptz AS clock_in,
        NULL::timestamptz AS clock_out,
        0::numeric AS actual_hours,
        0::numeric AS break_hours,
        NULL::text AS approval_status,
        NULL::uuid AS approved_by,
        NULL::timestamptz AS approved_at,
        NULL::text AS notes
      FROM shift_assignments sa
      JOIN employees e ON e.id = sa.employee_id AND e.tenant_id = sa.tenant_id
      LEFT JOIN shift_templates st ON st.id = sa.template_id AND st.tenant_id = sa.tenant_id
      LEFT JOIN locations l ON e.location_id = l.id AND l.tenant_id = sa.tenant_id
      WHERE sa.tenant_id = $1
        AND sa.date BETWEEN $2::date AND $3::date
        AND sa.is_published = true
        AND NOT EXISTS (
          SELECT 1 FROM shift_logs sl2
          WHERE sl2.tenant_id = sa.tenant_id
            AND sl2.employee_id = sa.employee_id
            AND (sl2.clock_in_time::date) = sa.date
        )
    `

    const timeEntrySql = `
      SELECT 
        te.id,
        'time_entry'::text AS row_source,
        te.employee_id,
        e.first_name || ' ' || e.last_name AS employee_name,
        e.employee_code,
        COALESCE(e.department, '') AS department,
        l.name AS location_name,
        te.date::text AS work_date,
        to_char(COALESCE(sa_match.override_start_time, sa_match.start_time, st.start_time), 'HH24:MI') AS scheduled_start,
        to_char(COALESCE(sa_match.override_end_time, sa_match.end_time, st.end_time), 'HH24:MI') AS scheduled_end,
        COALESCE(sa_match.override_name, st.name) AS scheduled_label,
        CASE 
          WHEN COALESCE(sa_match.override_start_time, sa_match.start_time, st.start_time) IS NOT NULL 
           AND COALESCE(sa_match.override_end_time, sa_match.end_time, st.end_time) IS NOT NULL
          THEN EXTRACT(EPOCH FROM (
            COALESCE(sa_match.override_end_time, sa_match.end_time, st.end_time) 
            - COALESCE(sa_match.override_start_time, sa_match.start_time, st.start_time)
          )) / 3600
          ELSE NULL 
        END AS scheduled_hours,
        te.clock_in AS clock_in,
        te.clock_out AS clock_out,
        te.total_hours AS actual_hours,
        COALESCE(te.break_hours, 0) AS break_hours,
        te.approval_status::text AS approval_status,
        te.approved_by,
        te.approved_at,
        te.notes
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id AND e.tenant_id = te.tenant_id
      LEFT JOIN locations l ON e.location_id = l.id AND l.tenant_id = te.tenant_id
      LEFT JOIN LATERAL (
        SELECT sa_inner.*
        FROM shift_assignments sa_inner
        WHERE sa_inner.tenant_id = te.tenant_id
          AND sa_inner.employee_id = te.employee_id
          AND (
            sa_inner.id = te.shift_assignment_id
            OR (te.shift_assignment_id IS NULL AND sa_inner.date = te.date)
          )
        ORDER BY CASE WHEN sa_inner.id = te.shift_assignment_id THEN 0 ELSE 1 END, sa_inner.is_published DESC
        LIMIT 1
      ) sa_match ON true
      LEFT JOIN shift_templates st ON st.id = sa_match.template_id AND st.tenant_id = sa_match.tenant_id
      WHERE te.tenant_id = $1
        AND te.date BETWEEN $2::date AND $3::date
        AND NOT EXISTS (
          SELECT 1 FROM shift_logs sl3
          WHERE sl3.tenant_id = te.tenant_id
            AND sl3.employee_id = te.employee_id
            AND (sl3.clock_in_time::date) = te.date
        )
    `

    const unionSql = `
      ${shiftLogSql}
      UNION ALL
      ${scheduleOnlySql}
      UNION ALL
      ${timeEntrySql}
      ORDER BY work_date DESC, employee_name ASC, row_source ASC
    `

    const result = await query(unionSql, [tenantId, startDate, endDate])

    const processedEntries = result.rows.map((row: Record<string, unknown>) => {
      const shiftAssignment =
        row.scheduled_start && row.scheduled_end
          ? {
              start_time: row.scheduled_start as string,
              end_time: row.scheduled_end as string,
            }
          : null

      const dateStr = String(row.work_date).split('T')[0]
      const discrepancies = detectDiscrepancies(
        {
          date: dateStr,
          clock_in: row.clock_in as string | null,
          clock_out: row.clock_out as string | null,
        },
        shiftAssignment
      )

      const breaks: unknown[] = []
      const rowSource = row.row_source as string
      const actualHoursNum = Number(row.actual_hours) || 0
      const breakH = Number(row.break_hours) || 0
      const totalApproved =
        rowSource === 'time_entry' ? actualHoursNum - breakH : Math.max(0, actualHoursNum - breakH)

      return {
        id: row.id as string,
        row_source: rowSource,
        can_approve: rowSource === 'time_entry',
        employee_id: row.employee_id as string,
        employee_name: row.employee_name as string,
        employee_code: row.employee_code as string,
        department: row.department as string,
        location_name: row.location_name as string | null,
        date: dateStr,
        scheduled_start: row.scheduled_start || null,
        scheduled_end: row.scheduled_end || null,
        scheduled_label: row.scheduled_label || null,
        actual_clock_in: (row.clock_in as string) || '',
        actual_clock_out: (row.clock_out as string) || undefined,
        scheduled_hours: row.scheduled_hours != null ? Number(row.scheduled_hours) : undefined,
        actual_hours: actualHoursNum,
        break_hours: breakH,
        total_approved_hours: totalApproved,
        discrepancies,
        is_approved: row.approval_status === 'approved' || row.approval_status === true,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        notes: row.notes,
        breaks,
      }
    })

    return NextResponse.json({
      success: true,
      data: processedEntries,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/timesheet:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
