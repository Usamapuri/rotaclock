import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for availability updates
const availabilitySchema = z.object({
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  is_available: z.boolean()
})

const updateAvailabilitySchema = z.object({
  availability: z.array(availabilitySchema)
})

/**
 * GET /api/employees/[id]/availability
 * Get employee availability schedule
 */
export async function GET(
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

    // Check if user is accessing their own availability or is admin
    if (user?.role !== 'admin' && user?.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access own availability' }, { status: 403 })
    }

    // Get employee availability
    const { data: availability, error } = await supabase
      .from('employee_availability')
      .select(`
        id,
        employee_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        created_at,
        updated_at
      `)
      .eq('employee_id', params.id)
      .order('day_of_week')

    if (error) {
      console.error('Error fetching employee availability:', error)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    return NextResponse.json({ availability })

  } catch (error) {
    console.error('Error in GET /api/employees/[id]/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/employees/[id]/availability
 * Update employee availability schedule
 */
export async function PUT(
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

    // Check if user is updating their own availability or is admin
    if (user?.role !== 'admin' && user?.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden: Can only update own availability' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateAvailabilitySchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { availability } = validationResult.data

    // Check if employee exists
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Delete existing availability records for this employee
    const { error: deleteError } = await supabase
      .from('employee_availability')
      .delete()
      .eq('employee_id', params.id)

    if (deleteError) {
      console.error('Error deleting existing availability:', deleteError)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    // Insert new availability records
    const availabilityData = availability.map(avail => ({
      employee_id: params.id,
      day_of_week: avail.day_of_week,
      start_time: avail.start_time,
      end_time: avail.end_time,
      is_available: avail.is_available
    }))

    const { data: newAvailability, error: insertError } = await supabase
      .from('employee_availability')
      .insert(availabilityData)
      .select(`
        id,
        employee_id,
        day_of_week,
        start_time,
        end_time,
        is_available,
        created_at,
        updated_at
      `)

    if (insertError) {
      console.error('Error inserting new availability:', insertError)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({ 
      availability: newAvailability,
      message: 'Availability updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/employees/[id]/availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 