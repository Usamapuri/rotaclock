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

    // Ensure role is admin
    const role = (employee.role || '').toLowerCase()
    if (role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    // Check if organization is active
    if (!employee.organization_id) {
      return NextResponse.json(
        { error: 'No organization associated with this account.' },
        { status: 403 }
      )
    }

    // Return admin data with tenant context
    return NextResponse.json({
      success: true,
      admin: {
        id: employee.id,
        employee_code: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        role: 'admin',
        tenant_id: employee.tenant_id,
        organization_id: employee.organization_id,
        organization_name: employee.organization_name,
        subscription_status: employee.subscription_status,
        subscription_plan: employee.subscription_plan
      }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
