import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

// Validation schema for break end
const breakEndSchema = z.object({
  notes: z.string().optional()
})

/**
 * POST /api/time/break-end
 * End a break for the current employee
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
      .eq('status', 'break')
      .single()

    if (timeEntryError || !currentTimeEntry) {
      return NextResponse.json({ error: 'No active break found' }, { status: 404 })
    }

    // Check if break was started
    if (!currentTimeEntry.break_start) {
      return NextResponse.json({ error: 'Break was not properly started' }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = breakEndSchema.parse(body)

    // Get current date and time
    const now = new Date().toISOString()

    // Calculate break duration
    const breakStart = new Date(currentTimeEntry.break_start)
    const breakEnd = new Date(now)
    const breakMinutes = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60)
    const breakHours = Math.round((breakMinutes / 60) * 100) / 100

    // Update time entry to end break
    const updateData = {
      break_end: now,
      status: 'in-progress',
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
      return NextResponse.json({ error: 'Failed to end break' }, { status: 500 })
    }

    // Create notification for break end
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Break Ended',
        message: `Your break has ended. Break duration: ${breakHours} hours`,
        type: 'info',
        action_url: '/employee/time-tracking'
      })

    return NextResponse.json({ 
      data: updatedTimeEntry,
      message: 'Break ended successfully',
      break_summary: {
        break_start: currentTimeEntry.break_start,
        break_end: now,
        break_duration_hours: breakHours
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/time/break-end:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 