import { NextRequest, NextResponse } from 'next/server'
import { authenticateEmployee, query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, password } = await request.json()

    if (!employeeId || !password) {
      return NextResponse.json({ error: 'Employee ID and password are required' }, { status: 400 })
    }

    const employee = await authenticateEmployee(employeeId, password)
    if (!employee) {
      return NextResponse.json({ error: 'Invalid employee ID or password' }, { status: 401 })
    }

    // Ensure role is team_lead. Fallback: if position includes 'lead'
    const role = (employee.role || '').toLowerCase()
    const position = (employee.position || '').toLowerCase()
    const isLead = role === 'team_lead' || position.includes('lead')
    if (!isLead) {
      return NextResponse.json({ error: 'Access denied. Team lead privileges required.' }, { status: 403 })
    }

    // Return minimal session info with tenant context
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
        role: 'team_lead',
        team_id: employee.team_id || null,
        tenant_id: employee.tenant_id,
        organization_id: employee.organization_id,
        organization_name: employee.organization_name,
        subscription_status: employee.subscription_status,
        subscription_plan: employee.subscription_plan
      }
    })
  } catch (error) {
    console.error('Team Lead login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
