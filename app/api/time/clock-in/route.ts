import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for clock-in
const clockInSchema = z.object({
  notes: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  shift_assignment_id: z.string().uuid().optional()
})

/**
 * POST /api/time/clock-in
 * Clock in for the current employee
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

    // Check if already clocked in
    const { data: existingTimeEntry } = await supabase
      .from('time_entries')
      .select('id, clock_in, status')
      .eq('employee_id', employee.id)
      .is('clock_out', null)
      .eq('status', 'in-progress')
      .single()

    if (existingTimeEntry) {
      return NextResponse.json({ 
        error: 'Already clocked in',
        data: {
          time_entry_id: existingTimeEntry.id,
          clock_in: existingTimeEntry.clock_in
        }
      }, { status: 409 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = clockInSchema.parse(body)

    // Get current date and time
    const now = new Date().toISOString()

    // Check if there's a scheduled shift for today
    let shiftAssignmentId = validatedData.shift_assignment_id
    if (!shiftAssignmentId) {
      const { data: todayShift } = await supabase
        .from('shift_assignments')
        .select('id, status')
        .eq('employee_id', employee.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .in('status', ['assigned', 'confirmed'])
        .single()

      if (todayShift) {
        shiftAssignmentId = todayShift.id
      }
    }

    // Create time entry
    const timeEntryData = {
      employee_id: employee.id,
      shift_assignment_id: shiftAssignmentId,
      clock_in: now,
      status: 'in-progress',
      notes: validatedData.notes,
      location_lat: validatedData.location_lat,
      location_lng: validatedData.location_lng
    }

    const { data: timeEntry, error: insertError } = await supabase
      .from('time_entries')
      .insert(timeEntryData)
      .select(`
        *,
        employee:employees(*),
        shift_assignment:shift_assignments(
          *,
          shift:shifts(*)
        )
      `)
      .single()

    if (insertError) {
      console.error('Error creating time entry:', insertError)
      return NextResponse.json({ error: 'Failed to clock in' }, { status: 500 })
    }

    // Create notification for successful clock-in
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title: 'Clock In Successful',
        message: `You have successfully clocked in at ${new Date(now).toLocaleTimeString()}`,
        type: 'success',
        action_url: '/employee/time-tracking'
      })

    return NextResponse.json({ 
      data: timeEntry,
      message: 'Successfully clocked in' 
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/time/clock-in:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 