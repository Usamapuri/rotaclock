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

    // Return employee data with tenant context (in production, you'd create a JWT token)
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_id: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        role: employee.role === 'team_lead' ? 'team_lead' : (employee.role === 'project_manager' ? 'project_manager' : 'employee'),
        tenant_id: employee.tenant_id,
        organization_id: employee.organization_id,
        organization_name: employee.organization_name,
        subscription_status: employee.subscription_status,
        subscription_plan: employee.subscription_plan
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
