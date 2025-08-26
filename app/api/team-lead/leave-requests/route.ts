import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

/**
 * GET /api/team-lead/leave-requests
 * Get leave requests for Team Lead's team members
 */
export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const employee_id = searchParams.get('employee_id')
    const leave_type = searchParams.get('leave_type')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')

    // Build the base query to get leave requests for team members
    let queryText = `
      SELECT 
        lr.*,
        e.first_name,
        e.last_name,
        e.email,
        e.employee_id as emp_id,
        e.department,
        aba.first_name as approved_by_first_name,
        aba.last_name as approved_by_last_name,
        aba.email as approved_by_email
      FROM leave_requests lr
      LEFT JOIN employees_new e ON lr.employee_id = e.id
      LEFT JOIN employees_new aba ON lr.approved_by = aba.id
      WHERE e.team_id = $1
    `

    const queryParams: any[] = [team.id]
    let paramIndex = 2

    // Add filters
    if (status) {
      queryText += ` AND lr.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (employee_id) {
      queryText += ` AND lr.employee_id = $${paramIndex}`
      queryParams.push(employee_id)
      paramIndex++
    }

    if (leave_type) {
      queryText += ` AND lr.type = $${paramIndex}`
      queryParams.push(leave_type)
      paramIndex++
    }

    if (start_date) {
      queryText += ` AND lr.start_date >= $${paramIndex}`
      queryParams.push(start_date)
      paramIndex++
    }

    if (end_date) {
      queryText += ` AND lr.end_date <= $${paramIndex}`
      queryParams.push(end_date)
      paramIndex++
    }

    // Order by creation date (newest first)
    queryText += ` ORDER BY lr.created_at DESC`

    const leaveRequestsResult = await query(queryText, queryParams)

    return NextResponse.json({
      data: leaveRequestsResult.rows
    })

  } catch (error) {
    console.error('Error in GET /api/team-lead/leave-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
