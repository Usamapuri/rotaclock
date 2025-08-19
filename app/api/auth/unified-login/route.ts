import { NextRequest, NextResponse } from 'next/server'
import { authenticateEmployeeByEmail } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const employee = await authenticateEmployeeByEmail(email, password)

    if (!employee) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Return employee data with role-based routing
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
        role: employee.role || 'employee',
        team_id: employee.team_id || null,
      }
    })

  } catch (error) {
    console.error('Unified login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
