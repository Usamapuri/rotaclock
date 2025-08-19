import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get shift logs for the employee
    const result = await query(`
      SELECT 
        id,
        employee_id,
        shift_assignment_id,
        clock_in_time,
        clock_out_time,
        total_shift_hours,
        break_time_used,
        max_break_allowed,
        is_late,
        is_no_show,
        late_minutes,
        status,
        total_calls_taken,
        leads_generated,
        performance_rating,
        shift_remarks,
        created_at,
        updated_at
      FROM shift_logs 
      WHERE employee_id = $1
      ORDER BY clock_in_time DESC
      LIMIT 50
    `, [employeeId])

    return NextResponse.json(result.rows)

  } catch (error) {
    console.error('Error fetching employee shift logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift logs' },
      { status: 500 }
    )
  }
}
