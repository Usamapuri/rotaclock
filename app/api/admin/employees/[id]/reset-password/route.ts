import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Generate a new password (you can customize this logic)
    const newPassword = 'password123' // Default password as per user preference
    
    // Update the employee's password in the database
    const result = await query(`
      UPDATE employees 
      SET password = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, employee_id, first_name, last_name, email
    `, [newPassword, id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      newPassword: newPassword,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email
      }
    })

  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
