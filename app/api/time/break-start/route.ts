import { NextRequest, NextResponse } from 'next/server'
import { createBreakLog, getShiftLogs, getCurrentBreak, query, getTimeEntries } from '@/lib/database'
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

    // Check if employee is already on break
    const currentBreak = await getCurrentBreak(target_employee_id)
    if (currentBreak) {
      return NextResponse.json(
        { error: 'Employee is already on break' },
        { status: 400 }
      )
    }

    // Get current active shift
    const shiftLogs = await getShiftLogs({
      employee_id: target_employee_id,
      status: 'active'
    })

    if (shiftLogs.length === 0) {
      return NextResponse.json(
        { error: 'No active shift found' },
        { status: 404 }
      )
    }

    const currentShift = shiftLogs[0]

    // Check if break time limit is reached
    if (currentShift.break_time_used >= currentShift.max_break_allowed) {
      return NextResponse.json(
        { error: 'Break time limit reached for this shift' },
        { status: 400 }
      )
    }

    // Calculate elapsed shift time before break
    const shiftStartTime = new Date(currentShift.clock_in_time)
    const breakStartTime = new Date()
    const elapsedShiftTime = (breakStartTime.getTime() - shiftStartTime.getTime()) / (1000 * 60 * 60) // hours

    // Create break log
    const breakLog = await createBreakLog({
      shift_log_id: currentShift.id,
      employee_id: target_employee_id,
      break_start_time: breakStartTime.toISOString(),
      break_type: 'lunch',
      status: 'active'
    })

    // FIX: Also update legacy time_entries system if it exists
    // Check if there's an active time entry for this employee
    const timeEntries = await getTimeEntries({
      employee_id: target_employee_id,
      status: 'in-progress'
    })

    if (timeEntries.length > 0) {
      const activeTimeEntry = timeEntries[0]
      // Update the time entry to show break status
      await query(`
        UPDATE time_entries 
        SET break_start = $1, status = 'break', updated_at = NOW()
        WHERE id = $2
      `, [breakStartTime.toISOString(), activeTimeEntry.id])
    }

    return NextResponse.json({
      success: true,
      data: breakLog,
      message: 'Break started successfully',
      elapsedShiftTime: elapsedShiftTime.toFixed(2) // Include elapsed time in response
    })

  } catch (error) {
    console.error('Error starting break:', error)
    return NextResponse.json(
      { error: 'Failed to start break' },
      { status: 500 }
    )
  }
} 