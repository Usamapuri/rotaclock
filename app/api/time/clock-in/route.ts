import { NextRequest, NextResponse } from 'next/server'
import { createShiftLog, getShiftAssignments, isEmployeeClockedIn } from '@/lib/database'
import { AuthService } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { employee_id } = await request.json()

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Check if employee is already clocked in
    const isClockedIn = await isEmployeeClockedIn(employee_id)
    if (isClockedIn) {
      return NextResponse.json(
        { error: 'Employee is already clocked in' },
        { status: 409 }
      )
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0]
    
    // Find today's shift assignment for this employee
    const shiftAssignments = await getShiftAssignments({
      start_date: today,
      end_date: today,
      employee_id: employee_id
    })

    let shift_assignment_id = null
    if (shiftAssignments.length > 0) {
      shift_assignment_id = shiftAssignments[0].id
    }

    // Create shift log
    const shiftLog = await createShiftLog({
      employee_id,
      shift_assignment_id,
      clock_in_time: new Date().toISOString(),
      break_time_used: 0,
      max_break_allowed: 1.0,
      is_late: false,
      is_no_show: false,
      late_minutes: 0,
      status: 'active'
    })

    return NextResponse.json({
      success: true,
      data: shiftLog,
      message: 'Successfully clocked in'
    })

  } catch (error) {
    console.error('Error in clock in:', error)
    return NextResponse.json(
      { error: 'Failed to clock in' },
      { status: 500 }
    )
  }
} 