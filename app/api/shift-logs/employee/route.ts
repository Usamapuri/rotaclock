import { NextRequest, NextResponse } from 'next/server'
import { getShiftLogs } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    const filters: any = { employee_id: employeeId }
    if (status) {
      filters.status = status
    }

    const shiftLogs = await getShiftLogs(filters)

    // Add timer information to each shift log
    const shiftLogsWithTimers = shiftLogs.slice(0, limit).map(shiftLog => {
      const now = new Date()
      const clockInTime = new Date(shiftLog.clock_in_time)
      
      let elapsedTime = 0
      let isActive = false
      let endTimeFormatted = null
      
      if (shiftLog.status === 'active') {
        elapsedTime = (now.getTime() - clockInTime.getTime()) / 1000 // seconds
        isActive = true
      } else if (shiftLog.clock_out_time) {
        const clockOutTime = new Date(shiftLog.clock_out_time)
        elapsedTime = (clockOutTime.getTime() - clockInTime.getTime()) / 1000 // seconds
        endTimeFormatted = clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      // Format elapsed time
      const hours = Math.floor(elapsedTime / 3600)
      const minutes = Math.floor((elapsedTime % 3600) / 60)
      const seconds = Math.floor(elapsedTime % 60)
      
      const formattedTime = hours > 0 
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

      return {
        ...shiftLog,
        elapsedTime: {
          seconds: Math.floor(elapsedTime),
          formatted: formattedTime,
          isActive: isActive
        },
        startTimeFormatted: clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTimeFormatted: endTimeFormatted,
        // Calculate work hours properly
        total_shift_hours: shiftLog.clock_out_time 
          ? (new Date(shiftLog.clock_out_time).getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
          : (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
      }
    })

    return NextResponse.json({
      success: true,
      data: shiftLogsWithTimers,
      total: shiftLogs.length
    })

  } catch (error) {
    console.error('Error getting employee shift logs:', error)
    return NextResponse.json(
      { error: 'Failed to get shift logs' },
      { status: 500 }
    )
  }
}
