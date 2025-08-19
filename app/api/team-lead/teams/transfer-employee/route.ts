import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

const transferEmployeeSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  target_team_id: z.string().uuid('Invalid team ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isTeamLead(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, target_team_id } = transferEmployeeSchema.parse(body)

    // Verify the team lead manages the source team
    const sourceTeamCheck = await query(
      'SELECT id FROM teams WHERE team_lead_id = $1 AND is_active = true',
      [user!.id]
    )

    if (sourceTeamCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'You are not assigned as a team lead' },
        { status: 403 }
      )
    }

    const sourceTeamId = sourceTeamCheck.rows[0].id

    // Verify the employee is in the team lead's team
    const employeeCheck = await query(
      'SELECT id, team_id FROM employees WHERE id = $1 AND team_id = $2 AND is_active = true',
      [employee_id, sourceTeamId]
    )

    if (employeeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found in your team' },
        { status: 404 }
      )
    }

    // Verify the target team exists and is active
    const targetTeamCheck = await query(
      'SELECT id FROM teams WHERE id = $1 AND is_active = true',
      [target_team_id]
    )

    if (targetTeamCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Target team not found' },
        { status: 404 }
      )
    }

    // Transfer employee to target team
    const result = await query(
      `UPDATE employees 
       SET team_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, first_name, last_name, team_id`,
      [target_team_id, employee_id]
    )

    // Create team assignment record
    await query(
      `INSERT INTO team_assignments (employee_id, team_id, assigned_date, is_active)
       VALUES ($1, $2, CURRENT_DATE, true)
       ON CONFLICT (employee_id, team_id, assigned_date) DO UPDATE SET is_active = true`,
      [employee_id, target_team_id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Employee transferred successfully'
    })

  } catch (error) {
    console.error('Error transferring employee:', error)
    return NextResponse.json(
      { error: 'Failed to transfer employee' },
      { status: 500 }
    )
  }
}
