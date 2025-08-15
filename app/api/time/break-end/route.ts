import { NextRequest, NextResponse } from 'next/server'
import { updateBreakLog, getCurrentBreak, updateShiftLog, query, getTimeEntries } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const { employee_id } = await request.json()

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get current active break
    const currentBreak = await getCurrentBreak(employee_id)
    if (!currentBreak) {
      return NextResponse.json(
        { error: 'No active break found' },
        { status: 404 }
      )
    }

    const breakEndTime = new Date()
    const breakStartTime = new Date(currentBreak.break_start_time)
    const breakDuration = (breakEndTime.getTime() - breakStartTime.getTime()) / (1000 * 60 * 60) // hours

    // Update break log to complete it
    const updatedBreak = await updateBreakLog(currentBreak.id, {
      break_end_time: breakEndTime.toISOString(),
      break_duration: breakDuration,
      status: 'completed'
    })

    // Update shift log to add the break time used and keep it active
    const currentBreakTimeUsed = currentBreak.shift_log?.break_time_used || 0
    const newBreakTimeUsed = currentBreakTimeUsed + breakDuration

    await updateShiftLog(currentBreak.shift_log_id, {
      break_time_used: newBreakTimeUsed,
      status: 'active' // Keep the shift active after break ends
    })

    // FIX: Also update legacy time_entries system if it exists
    // Check if there's an active time entry for this employee
    const timeEntries = await getTimeEntries({
      employee_id: employee_id,
      status: 'break'
    })

    if (timeEntries.length > 0) {
      const activeTimeEntry = timeEntries[0]
      // Update the time entry to resume work (set break_end and change status back to in-progress)
      await query(`
        UPDATE time_entries 
        SET break_end = $1, status = 'in-progress', updated_at = NOW()
        WHERE id = $2
      `, [breakEndTime.toISOString(), activeTimeEntry.id])
    }

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