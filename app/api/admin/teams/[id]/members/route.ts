import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const addMemberSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID')
})

export async function GET(
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

    // Get team members with detailed information
    const result = await query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.position,
        e.employee_id,
        e.created_at as joined_date,
        'member' as role
      FROM employees e
      WHERE e.team_id = $1 AND e.is_active = true
      ORDER BY e.first_name, e.last_name
    `, [teamId])

    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    })
  } catch (err) {
    console.error('GET /api/admin/teams/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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
    const { employee_id } = addMemberSchema.parse(body)

    // Verify the team exists
    const teamCheck = await query(
      'SELECT id FROM teams WHERE id = $1 AND is_active = true',
      [teamId]
    )

    if (teamCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Verify the employee exists and is not already in a team
    const employeeCheck = await query(
      'SELECT id, team_id FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    )

    if (employeeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    if (employeeCheck.rows[0].team_id) {
      return NextResponse.json(
        { error: 'Employee is already assigned to a team' },
        { status: 400 }
      )
    }

    // Add employee to team
    const result = await query(
      `UPDATE employees 
       SET team_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [teamId, employee_id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Team member added successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message 
      }, { status: 400 })
    }
    
    console.error('Error adding team member:', error)
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    )
  }
}
