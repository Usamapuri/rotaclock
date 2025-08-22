import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const date = params.date
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id') || ''

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Calculate week start (Monday) and end (Sunday)
    const weekStart = new Date(date)
    const dayOfWeek = weekStart.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    weekStart.setDate(weekStart.getDate() - daysToMonday)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Get all employees for the week
    let employeesQuery = `
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        email,
        department,
        position
      FROM employees
      WHERE is_active = true
    `
    const employeesParams: any[] = []

    if (employeeId) {
      employeesQuery += ` AND id = $1`
      employeesParams.push(employeeId)
    }

    employeesQuery += ` ORDER BY first_name, last_name`

    const employeesResult = await query(employeesQuery, employeesParams)
    const employees = employeesResult.rows

    // Get shift assignments for the week
    let assignmentsQuery = `
      SELECT 
        sa.id,
        sa.employee_id,
        sa.shift_id,
        sa.date,
        sa.status,
        sa.notes,
        sa.created_at,
        s.name as shift_name,
        s.start_time,
        s.end_time,
        s.color,
        s.department as shift_department
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= $1 AND sa.date <= $2
    `
    const assignmentsParams = [weekStartStr, weekEndStr]

    if (employeeId) {
      assignmentsQuery += ` AND sa.employee_id = $3`
      assignmentsParams.push(employeeId)
    }

    assignmentsQuery += ` ORDER BY sa.date, sa.employee_id`

    const assignmentsResult = await query(assignmentsQuery, assignmentsParams)
    const assignments = assignmentsResult.rows

    // Get shift templates
    const templatesResult = await query(`
      SELECT 
        id,
        name,
        start_time,
        end_time,
        department,
        color,
        required_staff
      FROM shifts
      WHERE is_active = true
      ORDER BY name
    `)
    const templates = templatesResult.rows

    // Organize data by employee and date
    const scheduleData = {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      employees: employees.map(emp => ({
        ...emp,
        assignments: {}
      })),
      templates,
      assignments: assignments
    }

    // Populate assignments for each employee
    employees.forEach(employee => {
      const employeeAssignments = assignments.filter(a => a.employee_id === employee.id)
      employeeAssignments.forEach(assignment => {
        const dateKey = assignment.date
        if (!scheduleData.employees.find(e => e.id === employee.id)?.assignments[dateKey]) {
          scheduleData.employees.find(e => e.id === employee.id)!.assignments[dateKey] = []
        }
        scheduleData.employees.find(e => e.id === employee.id)!.assignments[dateKey].push(assignment)
      })
    })

    return NextResponse.json({
      success: true,
      data: scheduleData
    })

  } catch (error) {
    console.error('Error fetching week schedule:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch week schedule' },
      { status: 500 }
    )
  }
}
