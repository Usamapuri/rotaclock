import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const { email } = params

    const result = await query(`
      SELECT 
        e.employee_id,
        e.email,
        e.first_name,
        e.last_name,
        e.role,
        r.display_name as role_display_name,
        r.description as role_description,
        r.permissions,
        r.dashboard_access
      FROM employees e
      LEFT JOIN roles r ON e.role = r.name
      WHERE e.email = $1
    `, [email])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching employee role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee role' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const { email } = params
    const { new_role, reason, assigned_by } = await request.json()

    if (!new_role) {
      return NextResponse.json(
        { error: 'New role is required' },
        { status: 400 }
      )
    }

    // Get current role
    const currentRoleResult = await query(`
      SELECT role FROM employees WHERE email = $1
    `, [email])

    if (currentRoleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const old_role = currentRoleResult.rows[0].role

    // Update employee role
    await query(`
      UPDATE employees 
      SET role = $1, updated_at = NOW()
      WHERE email = $2
    `, [new_role, email])

    // Record role assignment history
    await query(`
      INSERT INTO role_assignments (
        employee_id,
        employee_email,
        old_role,
        new_role,
        assigned_by,
        reason
      ) VALUES (
        (SELECT employee_id FROM employees WHERE email = $1),
        $1,
        $2,
        $3,
        $4,
        $5
      )
    `, [email, old_role, new_role, assigned_by || 'admin', reason || 'Role update'])

    // Get updated employee info
    const result = await query(`
      SELECT 
        e.employee_id,
        e.email,
        e.first_name,
        e.last_name,
        e.role,
        r.display_name as role_display_name,
        r.description as role_description,
        r.permissions,
        r.dashboard_access
      FROM employees e
      LEFT JOIN roles r ON e.role = r.name
      WHERE e.email = $1
    `, [email])

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      employee: result.rows[0],
      old_role,
      new_role
    })
  } catch (error) {
    console.error('Error updating employee role:', error)
    return NextResponse.json(
      { error: 'Failed to update employee role' },
      { status: 500 }
    )
  }
}
