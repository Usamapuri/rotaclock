import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

/**
 * GET /api/employees/online
 * Get all currently online employees
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user } = await authMiddleware(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all online employees with their current shift information
    const result = await query(`
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.is_online,
        e.last_online,
        sl.id as shift_log_id,
        sl.clock_in_time,
        sl.status as shift_status,
        sl.total_shift_hours,
        sl.break_time_used
      FROM employees_new e
      LEFT JOIN shift_logs sl ON e.id = sl.employee_id AND sl.status = 'active'
      WHERE e.is_online = true AND e.is_active = true
      ORDER BY e.last_online DESC
    `)

    const onlineEmployees = result.rows.map(row => {
      const clockInTime = row.clock_in_time ? new Date(row.clock_in_time) : null
      const now = new Date()
      
      let shiftDuration = null
      if (clockInTime) {
        const durationMs = now.getTime() - clockInTime.getTime()
        const hours = Math.floor(durationMs / (1000 * 60 * 60))
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
        shiftDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      }

      return {
        id: row.id,
        employee_id: row.employee_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        department: row.department,
        position: row.position,
        is_online: row.is_online,
        last_online: row.last_online,
        shift_log_id: row.shift_log_id,
        clock_in_time: row.clock_in_time,
        shift_status: row.shift_status,
        shift_duration: shiftDuration,
        total_shift_hours: row.total_shift_hours,
        break_time_used: row.break_time_used
      }
    })

    return NextResponse.json({
      success: true,
      data: onlineEmployees,
      total: onlineEmployees.length
    })

  } catch (error) {
    console.error('Error getting online employees:', error)
    return NextResponse.json(
      { error: 'Failed to get online employees' },
      { status: 500 }
    )
  }
}
