import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for break start
const breakStartSchema = z.object({
  notes: z.string().optional()
})

/**
 * POST /api/time/break-start
 * Start a break for the current employee
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

    // Check if already on break
    if (currentTimeEntry.status === 'break') {
      return NextResponse.json({ error: 'Already on break' }, { status: 409 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = breakStartSchema.parse(body)

    // Get current date and time
    const now = new Date().toISOString()

    // Update time entry to start break
    const updateData = {
      break_start: now,
      status: 'break',
      notes: validatedData.notes
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
      return NextResponse.json({ error: 'Failed to start break' }, { status: 500 })
    }

    // Create notification for break start
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Break Started',
        message: `Your break has started at ${new Date(now).toLocaleTimeString()}`,
        type: 'info',
        action_url: '/employee/time-tracking'
      })

    return NextResponse.json({ 
      data: updatedTimeEntry,
      message: 'Break started successfully',
      break_start: now
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/time/break-start:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 