import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift start verification
const verifyStartSchema = z.object({
  verification_image: z.string().min(1, 'Verification image is required'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  device_info: z.object({
    user_agent: z.string().optional(),
    platform: z.string().optional(),
    timestamp: z.string().optional()
  }).optional()
})

/**
 * POST /api/shifts/[id]/verify-start
 * Verify shift start with camera and location data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = verifyStartSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { verification_image, location, device_info } = validationResult.data

    // Get the shift details
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select(`
        id,
        employee_id,
        shift_template_id,
        start_time,
        end_time,
        status,
        actual_start_time,
        actual_end_time,
        shift_template:shift_templates!shifts_shift_template_id_fkey(
          id,
          name,
          start_time,
          end_time
        )
      `)
      .eq('id', params.id)
      .single()

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Check if the user owns this shift
    if (shift.employee_id !== user?.id && user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Can only start your own shifts' }, { status: 403 })
    }

    // Check if shift is already started
    if (shift.status === 'in_progress' || shift.actual_start_time) {
      return NextResponse.json({ error: 'Shift is already in progress' }, { status: 400 })
    }

    // Check if shift is in the past
    const now = new Date()
    const shiftStartTime = new Date(shift.start_time)
    const timeDiff = Math.abs(now.getTime() - shiftStartTime.getTime()) / (1000 * 60) // minutes

    // Allow starting shift up to 15 minutes early or 30 minutes late
    if (timeDiff > 45) {
      return NextResponse.json({ 
        error: 'Shift can only be started within 15 minutes before or 30 minutes after scheduled start time' 
      }, { status: 400 })
    }

    // Store verification data
    const verificationData = {
      shift_id: params.id,
      employee_id: shift.employee_id,
      verification_type: 'start',
      verification_image,
      location_data: location,
      device_info,
      verification_status: 'verified',
      verified_at: new Date().toISOString()
    }

    const { data: verification, error: verificationError } = await supabase
      .from('shift_verifications')
      .insert(verificationData)
      .select()
      .single()

    if (verificationError) {
      console.error('Error creating verification record:', verificationError)
      return NextResponse.json({ error: 'Failed to record verification' }, { status: 500 })
    }

    // Update shift status to in_progress
    const { data: updatedShift, error: updateError } = await supabase
      .from('shifts')
      .update({
        status: 'in_progress',
        actual_start_time: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        id,
        employee_id,
        shift_template_id,
        start_time,
        end_time,
        status,
        actual_start_time,
        actual_end_time
      `)
      .single()

    if (updateError) {
      console.error('Error updating shift status:', updateError)
      return NextResponse.json({ error: 'Failed to start shift' }, { status: 500 })
    }

    // Create time entry for the shift
    const { data: timeEntry, error: timeEntryError } = await supabase
      .from('time_entries')
      .insert({
        employee_id: shift.employee_id,
        shift_id: params.id,
        entry_type: 'clock_in',
        timestamp: new Date().toISOString(),
        location_data: location,
        device_info
      })
      .select()
      .single()

    if (timeEntryError) {
      console.error('Error creating time entry:', timeEntryError)
      // Don't fail the request if time entry creation fails
    }

    return NextResponse.json({ 
      shift: updatedShift,
      verification,
      timeEntry,
      message: 'Shift started successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/verify-start:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 