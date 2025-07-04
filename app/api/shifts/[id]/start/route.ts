import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/shifts/[id]/start
 * Start a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if shift exists and get current status
    const { data: shift, error: fetchError } = await supabase
      .from('shifts')
      .select('id, status, employee_id, start_time, end_time')
      .eq('id', id)
      .single()

    if (fetchError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Check if user is the employee assigned to this shift
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employee || employee.id !== shift.employee_id) {
      return NextResponse.json({ error: 'You can only start your own shifts' }, { status: 403 })
    }

    // Validate shift status
    if (shift.status !== 'scheduled') {
      return NextResponse.json({ 
        error: `Cannot start shift with status: ${shift.status}` 
      }, { status: 400 })
    }

    // Check if shift time is appropriate (within 15 minutes of start time)
    const now = new Date()
    const startTime = new Date(shift.start_time)
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60) // minutes

    if (timeDiff > 15) {
      return NextResponse.json({ 
        error: 'Shift can only be started within 15 minutes of the scheduled start time' 
      }, { status: 400 })
    }

    // Check if employee has any other active shifts
    const { data: activeShifts, error: activeError } = await supabase
      .from('shifts')
      .select('id')
      .eq('employee_id', shift.employee_id)
      .eq('status', 'in-progress')

    if (activeError) {
      console.error('Error checking active shifts:', activeError)
      return NextResponse.json({ error: 'Failed to check active shifts' }, { status: 500 })
    }

    if (activeShifts && activeShifts.length > 0) {
      return NextResponse.json({ 
        error: 'You already have an active shift. Please end it before starting a new one.' 
      }, { status: 400 })
    }

    // Start the shift
    const { data: updatedShift, error: updateError } = await supabase
      .from('shifts')
      .update({ 
        status: 'in-progress',
        start_time: new Date().toISOString() // Update actual start time
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error starting shift:', updateError)
      return NextResponse.json({ error: 'Failed to start shift' }, { status: 500 })
    }

    return NextResponse.json({ 
      shift: updatedShift,
      message: 'Shift started successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/start:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 