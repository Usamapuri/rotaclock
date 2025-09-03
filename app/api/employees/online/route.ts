import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

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

    const tenant = await getTenantContext(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Get all online employees with their current shift information scoped by tenant
    const result = await query(`
      SELECT 
        e.id,
        e.employee_code as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.job_position as position,
        e.is_online,
        e.last_online,
        te.id as time_entry_id,
        te.clock_in as clock_in_time,
        te.status as shift_status,
        te.total_hours as total_shift_hours,
        te.break_hours as break_time_used
      FROM employees e
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.status IN ('in-progress','break')
      WHERE e.is_online = true AND e.is_active = true AND e.tenant_id = $1
      ORDER BY e.last_online DESC
    `, [tenant.tenant_id])

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
        shift_log_id: row.time_entry_id,
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
