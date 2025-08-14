import { NextRequest, NextResponse } from 'next/server'
import { authenticateEmployee } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: 'Employee ID and password are required' },
        { status: 400 }
      )
    }

    const employee = await authenticateEmployee(employeeId, password)

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid employee ID or password' },
        { status: 401 }
      )
    }

    // Return employee data (in production, you'd create a JWT token)
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        role: 'employee'
      }
    })

  } catch (error) {
    console.error('Employee login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
