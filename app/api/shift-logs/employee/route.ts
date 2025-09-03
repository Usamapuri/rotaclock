import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const limit = Number(searchParams.get('limit') || '50')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Proxy shift logs to unified time_entries for the employee
    const result = await query(`
      SELECT 
        id,
        employee_id,
        assignment_id as shift_assignment_id,
        clock_in as clock_in_time,
        clock_out as clock_out_time,
        total_hours as total_shift_hours,
        break_hours as break_time_used,
        NULL::numeric as max_break_allowed,
        FALSE as is_late,
        FALSE as is_no_show,
        0 as late_minutes,
        status,
        NULL::int as total_calls_taken,
        NULL::int as leads_generated,
        NULL::int as performance_rating,
        notes as shift_remarks,
        created_at,
        updated_at
      FROM time_entries 
      WHERE employee_id = $1
      ORDER BY clock_in DESC
      LIMIT $2
    `, [employeeId, limit])

    return NextResponse.json({ success: true, data: result.rows })

  } catch (error) {
    console.error('Error fetching employee shift logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift logs' },
      { status: 500 }
    )
  }
}
