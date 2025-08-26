import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const changeLeadSchema = z.object({
  new_team_lead_id: z.string().uuid('Invalid team lead ID')
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = params
    const body = await request.json()
    const { new_team_lead_id } = changeLeadSchema.parse(body)

    // Verify the team exists
    const teamCheck = await query(
      'SELECT id, team_lead_id FROM teams WHERE id = $1 AND is_active = true',
      [teamId]
    )

    if (teamCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    const currentTeamLeadId = teamCheck.rows[0].team_lead_id

    // Verify the new team lead exists and is active
    const newLeadCheck = await query(
      'SELECT id, first_name, last_name, email, position FROM employees_new WHERE id = $1 AND is_active = true',
      [new_team_lead_id]
    )

    if (newLeadCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'New team lead not found' },
        { status: 404 }
      )
    }

    // Check if the new team lead is already a team lead of another team
    const existingLeadCheck = await query(
      'SELECT id FROM teams WHERE team_lead_id = $1 AND id != $2 AND is_active = true',
      [new_team_lead_id, teamId]
    )

    if (existingLeadCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'Employee is already a team lead of another team' },
        { status: 400 }
      )
    }

    // Update the team with new team lead
    const result = await query(
      `UPDATE teams 
       SET team_lead_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [new_team_lead_id, teamId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update team lead' },
        { status: 500 }
      )
    }

    // If there was a previous team lead, remove their team_lead role (optional)
    if (currentTeamLeadId && currentTeamLeadId !== new_team_lead_id) {
      // You might want to update the employee's role here if you have a role system
      // For now, we'll just log it
      console.log(`Previous team lead ${currentTeamLeadId} replaced with ${new_team_lead_id}`)
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Team lead changed successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message 
      }, { status: 400 })
    }
    
    console.error('Error changing team lead:', error)
    return NextResponse.json(
      { error: 'Failed to change team lead' },
      { status: 500 }
    )
  }
}
