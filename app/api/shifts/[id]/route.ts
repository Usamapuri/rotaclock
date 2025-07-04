import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * GET /api/shifts/[id]
 * Get a specific shift by ID
 */
export async function GET(
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

    const { data: shift, error } = await supabase
      .from('shifts')
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single()

    if (error || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ shift })

  } catch (error) {
    console.error('Error in GET /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/shifts/[id]
 * Update a shift
 */
export async function PATCH(
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
    const body = await request.json()
    const { start_time, end_time, status, notes, location } = body

    // Check if shift exists
    const { data: existingShift, error: fetchError } = await supabase
      .from('shifts')
      .select('id, status, start_time, end_time, employee_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingShift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Validate dates if provided
    if (start_time && end_time) {
      const startDate = new Date(start_time)
      const endDate = new Date(end_time)
      
      if (startDate >= endDate) {
        return NextResponse.json({ 
          error: 'End time must be after start time' 
        }, { status: 400 })
      }

      // Check for overlapping shifts (excluding current shift and cancelled shifts)
      const { data: overlappingShifts, error: overlapError } = await supabase
        .from('shifts')
        .select('id')
        .eq('employee_id', existingShift.employee_id)
        .neq('id', id)
        .neq('status', 'cancelled')
        .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

      if (overlapError) {
        console.error('Error checking overlapping shifts:', overlapError)
        return NextResponse.json({ error: 'Failed to check shift conflicts' }, { status: 500 })
      }

      if (overlappingShifts && overlappingShifts.length > 0) {
        return NextResponse.json({ 
          error: 'Shift conflicts with existing shifts for this employee' 
        }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (start_time !== undefined) updateData.start_time = start_time
    if (end_time !== undefined) updateData.end_time = end_time
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (location !== undefined) updateData.location = location

    // Update shift
    const { data: shift, error: updateError } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error updating shift:', updateError)
      return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
    }

    return NextResponse.json({ 
      shift,
      message: 'Shift updated successfully' 
    })

  } catch (error) {
    console.error('Error in PATCH /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts/[id]
 * Delete a shift
 */
export async function DELETE(
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

    // Check if shift exists
    const { data: shift, error: fetchError } = await supabase
      .from('shifts')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Prevent deletion of in-progress shifts
    if (shift.status === 'in-progress') {
      return NextResponse.json({ 
        error: 'Cannot delete a shift that is currently in progress' 
      }, { status: 400 })
    }

    // Delete shift
    const { error: deleteError } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting shift:', deleteError)
      return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Shift deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
 