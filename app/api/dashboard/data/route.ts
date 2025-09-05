import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

// Simple in-memory cache for dashboard data
const cache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 5000 // 5 seconds cache

// Simple rate limiting
const rateLimit = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 100 // Max requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const userRateLimit = rateLimit.get(ip)
  
  if (!userRateLimit || now > userRateLimit.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }
  
  if (userRateLimit.count >= RATE_LIMIT_MAX) {
    return true
  }
  
  userRateLimit.count++
  return false
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    // Authentication and tenant context
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    // Check cache first
    const cacheKey = `dashboard-data-${tenantContext.tenant_id}`
    const cached = cache.get(cacheKey)
    const now = Date.now()
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        ...cached.data,
        cached: true,
        cacheAge: now - cached.timestamp
      })
    }

    // Get employee stats
    const employeesResult = await query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE is_active = true) as active_employees,
        COUNT(DISTINCT department) as total_departments
      FROM employees
      WHERE tenant_id = $1
    `, [tenantContext.tenant_id])

    // Current week shift assignments
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday

    const shiftsResult = await query(`
      SELECT 
        COUNT(*) as total_shifts,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_shifts
      FROM shift_assignments 
      WHERE tenant_id = $1 AND date BETWEEN $2 AND $3
    `, [tenantContext.tenant_id, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]])

    // Get request stats
    const requestStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_swap_requests
      FROM shift_swaps ss
      JOIN employees r ON ss.requester_id = r.id
      JOIN employees t ON ss.target_id = t.id
      WHERE r.tenant_id = $1 AND t.tenant_id = $1
    `, [tenantContext.tenant_id])

    const leaveStats = await query(`
      SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending_leave_requests
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.tenant_id = $1
    `, [tenantContext.tenant_id])

    // Get attendance stats
    const attendanceStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'in-progress') as current_attendance,
        COUNT(*) FILTER (WHERE status IN ('in-progress', 'break')) as active_time_entries
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      WHERE e.tenant_id = $1 AND te.date = CURRENT_DATE
    `, [tenantContext.tenant_id])

    const stats = {
      totalEmployees: parseInt(employeesResult.rows[0]?.total_employees || '0'),
      activeEmployees: parseInt(employeesResult.rows[0]?.active_employees || '0'),
      totalDepartments: parseInt(employeesResult.rows[0]?.total_departments || '0'),
      totalShifts: parseInt(shiftsResult.rows[0]?.total_shifts || '0'),
      completedShifts: parseInt(shiftsResult.rows[0]?.completed_shifts || '0'),
      pendingSwapRequests: parseInt(requestStats.rows[0]?.pending_swap_requests || '0'),
      pendingLeaveRequests: parseInt(leaveStats.rows[0]?.pending_leave_requests || '0'),
      currentAttendance: parseInt(attendanceStats.rows[0]?.current_attendance || '0'),
      activeTimeEntries: parseInt(attendanceStats.rows[0]?.active_time_entries || '0'),
      weeklyHours: 168,
      avgHoursPerEmployee: 0,
      attendanceRate: 0
    }

    // Derived stats
    if (stats.totalEmployees > 0) {
      stats.avgHoursPerEmployee = Math.round(168 / stats.totalEmployees)
    }

    if (stats.activeTimeEntries > 0) {
      stats.attendanceRate = Math.round((stats.currentAttendance / stats.activeTimeEntries) * 100)
    }

    // Recent employees
    const employeesDataResult = await query(`
      SELECT 
        e.id,
        e.employee_code as employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.job_position as position,
        e.is_active,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM time_entries te 
            WHERE te.employee_id = e.id 
            AND te.status = 'in-progress'
            AND te.date = CURRENT_DATE
          ) THEN 'online'
          WHEN EXISTS (
            SELECT 1 FROM time_entries te 
            WHERE te.employee_id = e.id 
            AND te.status = 'break'
            AND te.date = CURRENT_DATE
          ) THEN 'break'
          ELSE 'offline'
        END as status
      FROM employees e
      WHERE e.is_active = true AND e.tenant_id = $1
      ORDER BY e.first_name, e.last_name
      LIMIT 10
    `, [tenantContext.tenant_id])

    // Recent shift assignments
    const shiftsDataResult = await query(`
      SELECT 
        sa.id,
        sa.date,
        sa.status,
        e.first_name,
        e.last_name,
        st.name as shift_name,
        st.start_time,
        st.end_time
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id AND e.tenant_id = sa.tenant_id
      JOIN shift_templates st ON sa.template_id = st.id AND st.tenant_id = sa.tenant_id
      WHERE sa.date >= CURRENT_DATE AND sa.tenant_id = $1
      ORDER BY sa.date, st.start_time
      LIMIT 10
    `, [tenantContext.tenant_id])

    // Recent swap requests
    const swapRequestsDataResult = await query(`
      SELECT 
        ss.id,
        ss.status,
        ss.created_at,
        r.first_name as requester_first_name,
        r.last_name as requester_last_name,
        t.first_name as target_first_name,
        t.last_name as target_last_name,
        ss.reason
      FROM shift_swaps ss
      JOIN employees r ON ss.requester_id = r.id
      JOIN employees t ON ss.target_id = t.id
      WHERE r.tenant_id = $1 AND t.tenant_id = $1
      ORDER BY ss.created_at DESC
      LIMIT 5
    `, [tenantContext.tenant_id])

    // Recent leave requests
    const leaveRequestsDataResult = await query(`
      SELECT 
        lr.id,
        lr.type,
        lr.start_date,
        lr.end_date,
        lr.status,
        lr.created_at,
        e.first_name,
        e.last_name,
        lr.reason
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE e.tenant_id = $1
      ORDER BY lr.created_at DESC
      LIMIT 5
    `, [tenantContext.tenant_id])

    const responseData = {
      stats,
      data: {
        employees: employeesDataResult.rows,
        shifts: shiftsDataResult.rows,
        swapRequests: swapRequestsDataResult.rows,
        leaveRequests: leaveRequestsDataResult.rows,
        timestamp: new Date().toISOString()
      }
    }

    // Cache the response
    cache.set(cacheKey, { data: responseData, timestamp: now })

    return NextResponse.json({
      success: true,
      ...responseData,
      cached: false
    })
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}