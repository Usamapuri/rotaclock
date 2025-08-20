import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead, isEmployeeInTeamLeadTeam } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating swap requests
const updateSwapRequestSchema = z.object({
  status: z.enum(['approved', 'denied']),
  team_lead_notes: z.string().optional()
})

/**
 * GET /api/team-lead/shifts/swap-requests/[id]
 * Get a specific swap request for Team Lead's team
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

    // Get the swap request with related data
    const swapRequestResult = await query(`
      SELECT 
        ss.*,
        r.first_name as requester_first_name,
        r.last_name as requester_last_name,
        r.email as requester_email,
        r.team_id as requester_team_id,
        t.first_name as target_first_name,
        t.last_name as target_last_name,
        t.email as target_email,
        t.team_id as target_team_id,
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
      WHERE ss.id = $1
    `, [id])

    if (swapRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    const swapRequest = swapRequestResult.rows[0]

    // Check if both requester and target belong to the team lead's team
    if (swapRequest.requester_team_id !== team.id && swapRequest.target_team_id !== team.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access swap requests for team members' }, { status: 403 })
    }

    return NextResponse.json({ data: swapRequest })

  } catch (error) {
    console.error('Error in GET /api/team-lead/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/team-lead/shifts/swap-requests/[id]
 * Update a swap request (approve/deny) by Team Lead
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
    const validationResult = updateSwapRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { status, team_lead_notes } = validationResult.data

    // Get the current swap request
    const currentRequestResult = await query(`
      SELECT 
        ss.id,
        ss.requester_id,
        ss.target_id,
        ss.original_shift_id,
        ss.requested_shift_id,
        ss.status,
        r.team_id as requester_team_id,
        t.team_id as target_team_id
      FROM shift_swaps ss
      LEFT JOIN employees r ON ss.requester_id = r.id
      LEFT JOIN employees t ON ss.target_id = t.id
      WHERE ss.id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

    // Check if both requester and target belong to the team lead's team
    if (currentRequest.requester_team_id !== team.id && currentRequest.target_team_id !== team.id) {
      return NextResponse.json({ error: 'Forbidden: Can only manage swap requests for team members' }, { status: 403 })
    }

    // Only allow approval/denial of pending requests
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Can only approve/deny pending requests' }, { status: 400 })
    }

    // Update the swap request
    const updateData: any = { 
      status,
      updated_at: new Date(),
      approved_by: user!.id,
      approved_at: new Date()
    }
    
    if (team_lead_notes !== undefined) {
      updateData.admin_notes = team_lead_notes
    }

    const updateFields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const updateValues = Object.values(updateData)

    const updatedRequestResult = await query(`
      UPDATE shift_swaps
      SET ${updateFields}
      WHERE id = $1
      RETURNING *
    `, [id, ...updateValues])

    const updatedRequest = updatedRequestResult.rows[0]

    // If approved, swap the shift assignments
    if (status === 'approved') {
      try {
        // Swap the employee assignments
        await query(`
          UPDATE shift_assignments 
          SET employee_id = $1 
          WHERE id = $2
        `, [currentRequest.target_id, currentRequest.original_shift_id])

        await query(`
          UPDATE shift_assignments 
          SET employee_id = $1 
          WHERE id = $2
        `, [currentRequest.requester_id, currentRequest.requested_shift_id])
      } catch (swapError) {
        console.error('Error swapping shift assignments:', swapError)
      }
    }

    return NextResponse.json({ 
      data: updatedRequest,
      message: `Swap request ${status} successfully` 
    })

  } catch (error) {
    console.error('Error in PATCH /api/team-lead/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
