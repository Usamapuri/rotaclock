import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

/**
 * GET /api/shift-assignments/week/[date]
 * Get week schedule for a specific date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params
    
    // Calculate week start (Monday) and end (Sunday)
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(targetDate)
    monday.setDate(targetDate.getDate() - daysToMonday)
    
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = sunday.toISOString().split('T')[0]

    // Get week schedule with all employees and their assignments
    const queryText = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.department,
        e.job_position,
        e.role,
        sa.id as assignment_id,
        sa.date,
        sa.status as assignment_status,
        sa.start_time,
        sa.end_time,
        sa.notes as assignment_notes,
        st.id as template_id,
        st.name as template_name,
        st.start_time as template_start_time,
        st.end_time as template_end_time,
        st.color as template_color,
        st.department as template_department,
        t.name as team_name
      FROM employees_new e
      LEFT JOIN teams_new t ON e.team_id = t.id
      LEFT JOIN shift_assignments_new sa ON e.id = sa.employee_id 
        AND sa.date BETWEEN $1 AND $2
      LEFT JOIN shift_templates st ON sa.template_id = st.id
      WHERE e.is_active = true
      ORDER BY e.first_name, e.last_name, sa.date
    `

    const result = await query(queryText, [weekStart, weekEnd])
    
    // Group by employee and organize assignments by date
    const employees: any = {}
    
    result.rows.forEach((row: any) => {
      const employeeId = row.id
      
      if (!employees[employeeId]) {
        employees[employeeId] = {
          id: row.id,
          employee_code: row.employee_code,
          first_name: row.first_name,
          last_name: row.last_name,
          department: row.department,
          job_position: row.job_position,
          role: row.role,
          team_name: row.team_name,
          assignments: {}
        }
      }
      
      if (row.assignment_id) {
        employees[employeeId].assignments[row.date] = {
          id: row.assignment_id,
          date: row.date,
          status: row.assignment_status,
          start_time: row.start_time,
          end_time: row.end_time,
          notes: row.assignment_notes,
          template: {
            id: row.template_id,
            name: row.template_name,
            start_time: row.template_start_time,
            end_time: row.template_end_time,
            color: row.template_color,
            department: row.template_department
          }
        }
      }
    })

    // Generate week dates
    const weekDates = []
    const currentDate = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      weekDates.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return NextResponse.json({
      success: true,
      data: {
        week_start: weekStart,
        week_end: weekEnd,
        week_dates: weekDates,
        employees: Object.values(employees)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shift-assignments/week/[date]:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
