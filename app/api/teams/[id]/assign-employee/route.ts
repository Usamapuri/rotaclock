import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const employee_id = body?.employee_id
    
    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
    }

    // Verify the team exists
    const teamCheck = await query(
      'SELECT id FROM teams WHERE id = $1 AND is_active = true',
      [id]
    )

    if (teamCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify the employee exists and is not already assigned to a team
    const employeeCheck = await query(
      'SELECT id, team_id FROM employees WHERE id = $1 AND is_active = true',
      [employee_id]
    )

    if (employeeCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employeeCheck.rows[0].team_id) {
      return NextResponse.json(
        { error: 'Employee is already assigned to a team' },
        { status: 400 }
      )
    }

    // Assign employee to team
    const result = await query(
      'UPDATE employees SET team_id = $1 WHERE id = $2 RETURNING *',
      [id, employee_id]
    )

    // Also add to team_assignments table for historical tracking
    await query(
      `INSERT INTO team_assignments (employee_id, team_id, assigned_date)
       VALUES ($1, $2, CURRENT_DATE)
       ON CONFLICT (employee_id, team_id, assigned_date) DO NOTHING`,
      [employee_id, id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Employee assigned to team successfully'
    })

  } catch (error) {
    console.error('Error assigning employee to team:', error)
    return NextResponse.json(
      { error: 'Failed to assign employee to team' },
      { status: 500 }
    )
  }
}


