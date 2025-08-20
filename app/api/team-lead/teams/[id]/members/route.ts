import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead, addEmployeeToTeam, removeEmployeeFromTeam } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

const addMemberSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID')
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    
    if (!isAuthenticated || !isTeamLead(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const body = await request.json()
    const { employee_id } = addMemberSchema.parse(body)

    // Verify the team belongs to this team lead
    const team = await getTeamByLead(user!.id)
    if (!team || team.id !== teamId) {
      return NextResponse.json({ error: 'Forbidden: team not in your domain' }, { status: 403 })
    }

    // Verify the employee exists and is active
    const employeeResult = await query(
      'SELECT id FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    )
    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Add employee to team
    await addEmployeeToTeam(teamId, employee_id)

    return NextResponse.json({ 
      success: true, 
      message: 'Employee added to team successfully' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }
    
    if (error instanceof Error && error.message.includes('already a member')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }

    console.error('POST /api/team-lead/teams/[id]/members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    
    if (!isAuthenticated || !isTeamLead(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ error: 'memberId parameter is required' }, { status: 400 })
    }

    // Verify the team belongs to this team lead
    const team = await getTeamByLead(user!.id)
    if (!team || team.id !== teamId) {
      return NextResponse.json({ error: 'Forbidden: team not in your domain' }, { status: 403 })
    }

    // Verify the employee is actually in this team
    const memberResult = await query(`
      SELECT 1 FROM team_assignments 
      WHERE team_id = $1 AND employee_id = $2 AND is_active = true
    `, [teamId, memberId])
    
    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee is not a member of this team' }, { status: 404 })
    }

    // Remove employee from team
    await removeEmployeeFromTeam(teamId, memberId)

    return NextResponse.json({ 
      success: true, 
      message: 'Employee removed from team successfully' 
    })

  } catch (error) {
    console.error('DELETE /api/team-lead/teams/[id]/members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
