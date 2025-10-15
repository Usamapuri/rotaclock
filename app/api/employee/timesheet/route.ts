import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

interface Discrepancy {
  type: 'late_arrival' | 'early_departure' | 'missing_break' | 'excessive_break' | 'no_show' | 'overtime'
  severity: 'low' | 'medium' | 'high'
  message: string
  details?: any
}

function detectDiscrepancies(timeEntry: any, shiftAssignment: any): Discrepancy[] {
  const discrepancies: Discrepancy[] = []

  if (!timeEntry || !shiftAssignment) return discrepancies

  const clockInTime = new Date(timeEntry.clock_in)
  const clockOutTime = timeEntry.clock_out ? new Date(timeEntry.clock_out) : null
  const scheduledStart = new Date(`${timeEntry.date}T${shiftAssignment.start_time}`)
  const scheduledEnd = new Date(`${timeEntry.date}T${shiftAssignment.end_time}`)

  // Late arrival check
  if (clockInTime > scheduledStart) {
    const lateMinutes = Math.floor((clockInTime.getTime() - scheduledStart.getTime()) / (1000 * 60))
    discrepancies.push({
      type: 'late_arrival',
      severity: lateMinutes > 30 ? 'high' : lateMinutes > 15 ? 'medium' : 'low',
      message: `Late arrival by ${lateMinutes} minutes`,
      details: { lateMinutes, scheduledTime: shiftAssignment.start_time, actualTime: clockInTime.toTimeString().slice(0, 5) }
    })
  }

  // Early departure check
  if (clockOutTime && clockOutTime < scheduledEnd) {
    const earlyMinutes = Math.floor((scheduledEnd.getTime() - clockOutTime.getTime()) / (1000 * 60))
    discrepancies.push({
      type: 'early_departure',
      severity: earlyMinutes > 30 ? 'high' : earlyMinutes > 15 ? 'medium' : 'low',
      message: `Early departure by ${earlyMinutes} minutes`,
      details: { earlyMinutes, scheduledTime: shiftAssignment.end_time, actualTime: clockOutTime.toTimeString().slice(0, 5) }
    })
  }

  // No show check
  if (!timeEntry.clock_in) {
    discrepancies.push({
      type: 'no_show',
      severity: 'high',
      message: 'No show - did not clock in',
      details: { scheduledTime: shiftAssignment.start_time }
    })
  }

  // Break time checks
  const breakHours = Number(timeEntry.break_hours) || 0
  const scheduledHours = (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60 * 60)
  
  // Missing break for long shifts
  if (scheduledHours >= 6 && breakHours === 0) {
    discrepancies.push({
      type: 'missing_break',
      severity: 'medium',
      message: 'No break taken for shift longer than 6 hours',
      details: { scheduledHours, breakHours }
    })
  }

  // Excessive break time
  if (breakHours > 2) {
    discrepancies.push({
      type: 'excessive_break',
      severity: breakHours > 3 ? 'high' : 'medium',
      message: `Excessive break time: ${breakHours.toFixed(1)} hours`,
      details: { breakHours, recommendedMax: 2 }
    })
  }

  // Overtime check
  const actualHours = Number(timeEntry.total_hours) || 0
  if (actualHours > scheduledHours + 1) { // More than 1 hour over scheduled
    discrepancies.push({
      type: 'overtime',
      severity: actualHours > scheduledHours + 2 ? 'high' : 'medium',
      message: `Overtime: ${(actualHours - scheduledHours).toFixed(1)} hours over scheduled`,
      details: { actualHours, scheduledHours, overtimeHours: actualHours - scheduledHours }
    })
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

    // Check if user is employee
    if (user.role !== 'employee') {
      return NextResponse.json({ error: 'Access denied. Employee role required.' }, { status: 403 })
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

    // Get employee's timesheet entries with shift assignment data
    const timesheetQuery = `
      SELECT 
        te.id,
        te.employee_id,
        te.date,
        te.clock_in,
        te.clock_out,
        te.break_hours,
        te.total_hours as actual_hours,
        te.total_hours - te.break_hours as total_approved_hours,
        te.status,
        te.approval_status as is_approved,
        te.approved_by,
        te.approved_at,
        te.notes,
        te.admin_notes,
        te.rejection_reason,
        te.total_calls_taken,
        te.leads_generated,
        te.shift_remarks,
        te.performance_rating,
        sa.start_time as scheduled_start,
        sa.end_time as scheduled_end,
        CASE 
          WHEN sa.start_time IS NOT NULL AND sa.end_time IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (sa.end_time::time - sa.start_time::time)) / 3600
          ELSE NULL 
        END as scheduled_hours,
        json_build_object(
          'break_start', te.break_start,
          'break_end', te.break_end,
          'break_hours', te.break_hours
        ) as break_info
      FROM time_entries te
      LEFT JOIN shift_assignments sa ON te.employee_id = sa.employee_id 
        AND te.date = sa.date 
        AND sa.tenant_id = $1
        AND sa.status IN ('scheduled', 'assigned')
      WHERE te.employee_id = $2
        AND te.tenant_id = $1
        AND te.date BETWEEN $3 AND $4
      ORDER BY te.date DESC
    `

    const result = await query(timesheetQuery, [tenantContext.tenant_id, user.id, startDate, endDate])
    
    // Process entries and detect discrepancies
    const processedEntries = result.rows.map((entry: any) => {
      const discrepancies = detectDiscrepancies(entry, {
        start_time: entry.scheduled_start,
        end_time: entry.scheduled_end
      })

      return {
        ...entry,
        discrepancies,
        hasDiscrepancies: discrepancies.length > 0,
        highSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'high').length,
        mediumSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'medium').length,
        lowSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'low').length
      }
    })

    // Calculate summary statistics
    const summary = {
      totalEntries: processedEntries.length,
      totalHours: processedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.actual_hours) || 0), 0),
      totalApprovedHours: processedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.total_approved_hours) || 0), 0),
      totalBreakHours: processedEntries.reduce((sum: number, entry: any) => sum + (Number(entry.break_hours) || 0), 0),
      pendingApprovals: processedEntries.filter((entry: any) => entry.is_approved === 'pending').length,
      approvedEntries: processedEntries.filter((entry: any) => entry.is_approved === 'approved').length,
      rejectedEntries: processedEntries.filter((entry: any) => entry.is_approved === 'rejected').length,
      totalDiscrepancies: processedEntries.reduce((sum: number, entry: any) => sum + entry.discrepancies.length, 0),
      highSeverityDiscrepancies: processedEntries.reduce((sum: number, entry: any) => sum + entry.highSeverityDiscrepancies, 0),
      onTimePercentage: processedEntries.length > 0 
        ? (processedEntries.filter((entry: any) => 
            entry.discrepancies.filter((d: Discrepancy) => d.type === 'late_arrival').length === 0
          ).length / processedEntries.length) * 100 
        : 0
    }

    return NextResponse.json({
      success: true,
      data: processedEntries,
      summary
    })

  } catch (error) {
    console.error('Error in employee timesheet GET:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timesheet data' },
      { status: 500 }
    )
  }
}
