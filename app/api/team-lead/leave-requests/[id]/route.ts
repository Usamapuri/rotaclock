import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating leave requests
const updateLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  team_lead_notes: z.string().optional()
})

/**
 * GET /api/team-lead/leave-requests/[id]
 * Get a specific leave request for Team Lead's team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a team lead
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }

    // Get the team lead's team
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }

    // Get the leave request with related data
    const leaveRequestResult = await query(`
      SELECT 
        lr.*,
        e.first_name,
        e.last_name,
        e.email,
        e.employee_id as emp_id,
        e.department,
        e.team_id,
        aba.first_name as approved_by_first_name,
        aba.last_name as approved_by_last_name,
        aba.email as approved_by_email
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN employees aba ON lr.approved_by = aba.id
      WHERE lr.id = $1
    `, [id])

    if (leaveRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const leaveRequest = leaveRequestResult.rows[0]

    // Check if the employee belongs to the team lead's team
    if (leaveRequest.team_id !== team.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access leave requests for team members' }, { status: 403 })
    }

    return NextResponse.json({ data: leaveRequest })

  } catch (error) {
    console.error('Error in GET /api/team-lead/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/team-lead/leave-requests/[id]
 * Update a leave request (approve/reject) by Team Lead
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a team lead
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }

    // Get the team lead's team
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateLeaveRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { status, team_lead_notes } = validationResult.data

    // Get the current leave request
    const currentRequestResult = await query(`
      SELECT 
        lr.id,
        lr.employee_id,
        lr.status,
        e.team_id
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

    // Check if the employee belongs to the team lead's team
    if (currentRequest.team_id !== team.id) {
      return NextResponse.json({ error: 'Forbidden: Can only manage leave requests for team members' }, { status: 403 })
    }

    // Only allow approval/rejection of pending requests
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Can only approve/reject pending requests' }, { status: 400 })
    }

    // Build update query
    let updateQuery = `UPDATE leave_requests SET status = $1, updated_at = NOW(), approved_by = $2, approved_at = NOW()`
    const updateParams = [status, user!.id, id]
    let paramIndex = 4

    if (team_lead_notes !== undefined) {
      updateQuery += `, admin_notes = $${paramIndex}`
      updateParams.push(team_lead_notes)
      paramIndex++
    }

    updateQuery += ` WHERE id = $3 RETURNING *`

    // Update the leave request
    const updatedRequestResult = await query(updateQuery, updateParams)

    return NextResponse.json({ 
      data: updatedRequestResult.rows[0],
      message: `Leave request ${status} successfully` 
    })

  } catch (error) {
    console.error('Error in PATCH /api/team-lead/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
