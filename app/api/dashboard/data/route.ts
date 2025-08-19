import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

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

    // Check cache first
    const cacheKey = 'dashboard-data'
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

    // Get employees
    const employeesResult = await query(`
      SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE is_active = true) as active_employees
      FROM employees
    `)

    // Get current week shift assignments
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6) // Sunday

    const shiftsResult = await query(`
      SELECT 
        COUNT(*) as total_shifts,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_shifts
      FROM shift_assignments 
      WHERE date >= $1 AND date <= $2
    `, [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]])

    // Get pending requests
    const swapRequestsResult = await query(`
      SELECT COUNT(*) as pending_swap_requests
      FROM shift_swaps 
      WHERE status = 'pending'
    `)

    const leaveRequestsResult = await query(`
      SELECT COUNT(*) as pending_leave_requests
      FROM leave_requests 
      WHERE status = 'pending'
    `)

    // Get current attendance
    const attendanceResult = await query(`
      SELECT COUNT(*) as current_attendance
      FROM shift_logs 
      WHERE status = 'active'
    `)

    const timeEntriesResult = await query(`
      SELECT COUNT(*) as active_time_entries
      FROM time_entries 
      WHERE status IN ('in-progress', 'break')
    `)

    const stats = {
      totalEmployees: parseInt(employeesResult.rows[0]?.total_employees || '0'),
      activeEmployees: parseInt(employeesResult.rows[0]?.active_employees || '0'),
      totalShifts: parseInt(shiftsResult.rows[0]?.total_shifts || '0'),
      completedShifts: parseInt(shiftsResult.rows[0]?.completed_shifts || '0'),
      pendingSwapRequests: parseInt(swapRequestsResult.rows[0]?.pending_swap_requests || '0'),
      pendingLeaveRequests: parseInt(leaveRequestsResult.rows[0]?.pending_leave_requests || '0'),
      currentAttendance: parseInt(attendanceResult.rows[0]?.current_attendance || '0') + 
                        parseInt(timeEntriesResult.rows[0]?.active_time_entries || '0'),
      weeklyHours: 168,
      avgHoursPerEmployee: 0,
      attendanceRate: 0
    }

    // Calculate derived stats
    if (stats.totalEmployees > 0) {
      stats.avgHoursPerEmployee = Math.round(168 / stats.totalEmployees)
    }

    const totalTimeEntries = parseInt(timeEntriesResult.rows[0]?.active_time_entries || '0')
    if (totalTimeEntries > 0) {
      stats.attendanceRate = Math.round((stats.currentAttendance / totalTimeEntries) * 100)
    }

    // Get recent employees with status
    const employeesDataResult = await query(`
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.is_active,
        CASE 
          WHEN sl.status = 'active' THEN 'online'
          WHEN te.status = 'break' THEN 'break'
          ELSE 'offline'
        END as status
      FROM employees e
      LEFT JOIN shift_logs sl ON e.id = sl.employee_id AND sl.status = 'active'
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.status IN ('in-progress', 'break')
      WHERE e.is_active = true
      ORDER BY e.first_name, e.last_name
      LIMIT 10
    `)

    // Get recent shift assignments
    const shiftsDataResult = await query(`
      SELECT 
        sa.id,
        sa.date,
        sa.status,
        e.first_name,
        e.last_name,
        s.name as shift_name,
        s.start_time,
        s.end_time
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id
      JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= CURRENT_DATE
      ORDER BY sa.date, s.start_time
      LIMIT 10
    `)

    // Get recent swap requests
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
      ORDER BY ss.created_at DESC
      LIMIT 5
    `)

    // Get recent leave requests
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
      ORDER BY lr.created_at DESC
      LIMIT 5
    `)

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
