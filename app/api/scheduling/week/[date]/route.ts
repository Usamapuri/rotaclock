import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const { date } = await params
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id') || ''

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    const weekStart = new Date(date)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Employees for tenant
    let employeesQuery = `
      SELECT id, employee_code, first_name, last_name, email, department, job_position
      FROM employees_new
      WHERE is_active = true AND tenant_id = $1
    `
    const employeesParams: any[] = [tenantContext.tenant_id]

    if (employeeId) {
      employeesQuery += ` AND id = $2`
      employeesParams.push(employeeId)
    }

    employeesQuery += ` ORDER BY first_name, last_name`
    const employeesResult = await query(employeesQuery, employeesParams)
    const employees = employeesResult.rows

    // Determine if override columns exist
    const colCheck = await query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'shift_assignments_new' AND column_name = 'override_name' LIMIT 1
    `)
    const hasOverrides = colCheck.rows.length > 0

    // Assignments for tenant
    let assignmentsQuery = ''
    if (hasOverrides) {
      assignmentsQuery = `
        SELECT 
          sa.id,
          sa.employee_id,
          sa.template_id,
          to_char(sa.date, 'YYYY-MM-DD') as date,
          sa.override_name,
          sa.override_start_time,
          sa.override_end_time,
          sa.override_color,
          sa.status,
          sa.notes,
          sa.created_at,
          COALESCE(sa.override_name, st.name) as template_name,
          COALESCE(sa.override_start_time, st.start_time) as start_time,
          COALESCE(sa.override_end_time, st.end_time) as end_time,
          COALESCE(sa.override_color, st.color) as color,
          st.department as template_department
        FROM shift_assignments_new sa
        LEFT JOIN shift_templates st ON sa.template_id = st.id AND st.tenant_id = sa.tenant_id
        WHERE sa.date >= $1 AND sa.date <= $2 AND sa.tenant_id = $3
      `
    } else {
      assignmentsQuery = `
        SELECT 
          sa.id,
          sa.employee_id,
          sa.template_id,
          to_char(sa.date, 'YYYY-MM-DD') as date,
          sa.status,
          sa.notes,
          sa.created_at,
          st.name as template_name,
          st.start_time as start_time,
          st.end_time as end_time,
          st.color as color,
          st.department as template_department
        FROM shift_assignments_new sa
        LEFT JOIN shift_templates st ON sa.template_id = st.id AND st.tenant_id = sa.tenant_id
        WHERE sa.date >= $1 AND sa.date <= $2 AND sa.tenant_id = $3
      `
    }
    const assignmentsParams: any[] = [weekStartStr, weekEndStr, tenantContext.tenant_id]

    if (employeeId) {
      assignmentsQuery += ` AND sa.employee_id = $4`
      assignmentsParams.push(employeeId)
    }

    assignmentsQuery += ` ORDER BY sa.date, sa.employee_id`
    const assignmentsResult = await query(assignmentsQuery, assignmentsParams)
    const assignments = assignmentsResult.rows

    // Tenant templates
    const templatesResult = await query(`
      SELECT id, name, start_time, end_time, department, color, required_staff
      FROM shift_templates
      WHERE is_active = true AND tenant_id = $1
      ORDER BY name
    `, [tenantContext.tenant_id])
    const templates = templatesResult.rows

    const scheduleData = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      employees: employees.map(emp => ({ ...emp, assignments: {} })),
      templates,
      assignments: assignments,
    }

    employees.forEach(employee => {
      const employeeAssignments = assignments.filter(a => a.employee_id === employee.id)
      employeeAssignments.forEach(assignment => {
        const dateValue: any = (assignment as any).date
        const dateKey = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString().split('T')[0]
        const emp = scheduleData.employees.find(e => e.id === employee.id)!
        if (!emp.assignments[dateKey]) emp.assignments[dateKey] = []
        emp.assignments[dateKey].push(assignment)
      })
    })

    return NextResponse.json({ success: true, data: scheduleData })
  } catch (error) {
    console.error('Error fetching week schedule:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch week schedule' }, { status: 500 })
  }
}

