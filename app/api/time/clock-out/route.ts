import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for clock-out
const clockOutSchema = z.object({
  notes: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional()
})

/**
 * POST /api/time/clock-out
 * Clock out for the current employee
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, first_name, last_name, is_active')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (!employee.is_active) {
      return NextResponse.json({ error: 'Employee account is inactive' }, { status: 403 })
    }

    // Find current time entry
    const { data: currentTimeEntry, error: timeEntryError } = await supabase
      .from('time_entries')
      .select('id, clock_in, break_start, break_end, status')
      .eq('employee_id', employee.id)
      .is('clock_out', null)
      .eq('status', 'in-progress')
      .single()

    if (timeEntryError || !currentTimeEntry) {
      return NextResponse.json({ error: 'No active time entry found' }, { status: 404 })
    }

    // Check if currently on break
    if (currentTimeEntry.status === 'break') {
      return NextResponse.json({ error: 'Please end your break before clocking out' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = clockOutSchema.parse(body)

    // Get current date and time
    const now = new Date().toISOString()

    // Calculate total hours worked
    const clockInTime = new Date(currentTimeEntry.clock_in)
    const clockOutTime = new Date(now)
    const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60)
    
    let breakMinutes = 0
    if (currentTimeEntry.break_start && currentTimeEntry.break_end) {
      const breakStart = new Date(currentTimeEntry.break_start)
      const breakEnd = new Date(currentTimeEntry.break_end)
      breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
    }

    const totalHours = Math.round(((totalMinutes - breakMinutes) / 60) * 100) / 100

    // Update time entry
    const updateData = {
      clock_out: now,
      total_hours: totalHours,
      status: 'completed',
      notes: validatedData.notes,
      location_lat: validatedData.location_lat,
      location_lng: validatedData.location_lng
    }

    const { data: updatedTimeEntry, error: updateError } = await supabase
      .from('time_entries')
      .update(updateData)
      .eq('id', currentTimeEntry.id)
      .select(`
        *,
        employee:employees(*),
        shift_assignment:shift_assignments(
          *,
          shift:shifts(*)
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating time entry:', updateError)
      return NextResponse.json({ error: 'Failed to clock out' }, { status: 500 })
    }

    // Create notification for successful clock-out
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Clock Out Successful',
        message: `You have successfully clocked out. Total hours worked: ${totalHours} hours`,
        type: 'success',
        action_url: '/employee/time-tracking'
      })

    return NextResponse.json({ 
      data: updatedTimeEntry,
      message: 'Successfully clocked out',
      summary: {
        total_hours: totalHours,
        clock_in: currentTimeEntry.clock_in,
        clock_out: now
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/time/clock-out:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 