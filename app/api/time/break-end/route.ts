import { NextRequest, NextResponse } from 'next/server'
import { updateBreakLog, getCurrentBreak, updateShiftLog, query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authMiddleware = createApiAuthMiddleware()
    const authResult = await authMiddleware(request)
    if (!('isAuthenticated' in authResult) || !authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { employee_id } = await request.json()
    const requester_id = authResult.user.id

    // Use authenticated user's ID if employee_id not provided
    const target_employee_id = employee_id || requester_id

    if (!target_employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get current active break
    const currentBreak = await getCurrentBreak(target_employee_id)
    if (!currentBreak) {
      return NextResponse.json(
        { error: 'No active break found' },
        { status: 404 }
      )
    }

    const breakEndTime = new Date()
    const breakStartTime = new Date(currentBreak.break_start)
    const breakDuration = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60) // hours

    // Update break log to complete it
    const updatedBreak = await updateBreakLog(currentBreak.id, {
      break_end_time: breakEndTime.toISOString(),
      break_duration: breakDuration,
      status: 'completed'
    })

    // Update time entry: set break end and return to in-progress
    const newBreakTimeUsed = (currentBreak.break_hours || 0) + breakDuration
    await updateBreakLog(currentBreak.id, {
      break_end_time: breakEndTime.toISOString(),
      break_duration: newBreakTimeUsed,
      status: 'in-progress'
    })

    // Update employee online status to show they're back from break
    await query(`
      UPDATE employees 
      SET is_online = true, last_online = NOW()
      WHERE id = $1
    `, [target_employee_id])

    return NextResponse.json({
      success: true,
      data: updatedBreak,
      message: 'Break ended successfully',
      breakDuration: breakDuration.toFixed(2), // Include break duration in response
      totalBreakTimeUsed: newBreakTimeUsed.toFixed(2)
    })

  } catch (error) {
    console.error('Error ending break:', error)
    return NextResponse.json(
      { error: 'Failed to end break' },
      { status: 500 }
    )
  }
} 