import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
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
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo purposes, use a mock employee
    const employee = {
      id: 'demo-employee-id',
      first_name: 'Demo',
      last_name: 'Employee',
      is_active: true
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