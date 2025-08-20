import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

/**
 * GET /api/team-lead/shifts/swap-requests
 * Get swap requests for Team Lead's team members
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
    const requester_id = searchParams.get('requester_id')
    const target_id = searchParams.get('target_id')

    // Build the base query to get swap requests for team members
    let queryText = `
      SELECT 
        ss.*,
        r.first_name as requester_first_name,
        r.last_name as requester_last_name,
        r.email as requester_email,
        t.first_name as target_first_name,
        t.last_name as target_last_name,
        t.email as target_email,
        aba.first_name as approved_by_first_name,
        aba.last_name as approved_by_last_name,
        aba.email as approved_by_email,
        osa.shift_date as original_shift_date,
        osa.start_time as original_start_time,
        osa.end_time as original_end_time,
        rsa.shift_date as requested_shift_date,
        rsa.start_time as requested_start_time,
        rsa.end_time as requested_end_time
      FROM shift_swaps ss
      LEFT JOIN employees r ON ss.requester_id = r.id
      LEFT JOIN employees t ON ss.target_id = t.id
      LEFT JOIN employees aba ON ss.approved_by = aba.id
      LEFT JOIN shift_assignments osa ON ss.original_shift_id = osa.id
      LEFT JOIN shift_assignments rsa ON ss.requested_shift_id = rsa.id
      WHERE (r.team_id = $1 OR t.team_id = $1)
    `

    const queryParams: any[] = [team.id]
    let paramIndex = 2

    // Add filters
    if (status) {
      queryText += ` AND ss.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    if (requester_id) {
      queryText += ` AND ss.requester_id = $${paramIndex}`
      queryParams.push(requester_id)
      paramIndex++
    }

    if (target_id) {
      queryText += ` AND ss.target_id = $${paramIndex}`
      queryParams.push(target_id)
      paramIndex++
    }

    // Order by creation date (newest first)
    queryText += ` ORDER BY ss.created_at DESC`

    const swapRequestsResult = await query(queryText, queryParams)

    return NextResponse.json({
      data: swapRequestsResult.rows
    })

  } catch (error) {
    console.error('Error in GET /api/team-lead/shifts/swap-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
