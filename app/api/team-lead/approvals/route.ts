import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead, isProjectManager } from '@/lib/api-auth'

// GET: list pending approvals for current lead/PM's team
export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isTeamLead(user) && !isProjectManager(user) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Show approvals for employees in the same team as the approver (or all if admin/PM)
    let result
    if (isTeamLead(user)) {
      result = await query(`
        SELECT tea.*, sl.clock_in_time, sl.clock_out_time, sl.total_shift_hours,
               e.first_name, e.last_name, e.email
        FROM time_entry_approvals tea
        JOIN shift_logs sl ON sl.id = tea.time_entry_id
        JOIN employees e ON e.id = tea.employee_id
        WHERE tea.status = 'pending' AND e.team_id = (
          SELECT team_id FROM employees WHERE id = $1
        )
        ORDER BY sl.clock_in_time DESC
      `, [user.id])
    } else {
      result = await query(`
        SELECT tea.*, sl.clock_in_time, sl.clock_out_time, sl.total_shift_hours,
               e.first_name, e.last_name, e.email
        FROM time_entry_approvals tea
        JOIN shift_logs sl ON sl.id = tea.time_entry_id
        JOIN employees e ON e.id = tea.employee_id
        WHERE tea.status = 'pending'
        ORDER BY sl.clock_in_time DESC
      `)
    }

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Error in GET /api/team-lead/approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: approve or reject
export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isTeamLead(user) && !isProjectManager(user) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { time_entry_id, action, notes } = await request.json()
    if (!time_entry_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const status = action === 'approve' ? 'approved' : 'rejected'
    const result = await query(`
      UPDATE time_entry_approvals
      SET status = $2, approver_id = $3, decision_notes = $4, approved_at = NOW(), updated_at = NOW()
      WHERE time_entry_id = $1
      RETURNING *
    `, [time_entry_id, status, user.id, notes || null])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Approval record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error in POST /api/team-lead/approvals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


