import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating swap requests
const updateSwapRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  admin_notes: z.string().optional()
})

/**
 * GET /api/shifts/swap-requests/[id]
 * Get a specific swap request
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

    // Get the swap request with related data
    const { data: swapRequest, error } = await supabase
      .from('shift_swap_requests')
      .select(`
        id,
        requester_shift_id,
        target_shift_id,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at,
        requester_shift:shifts!shift_swap_requests_requester_shift_id_fkey(
          id,
          employee_id,
          shift_template_id,
          start_time,
          end_time,
          status,
          employee:employees!shifts_employee_id_fkey(
            id,
            first_name,
            last_name,
            employee_id
          )
        ),
        target_shift:shifts!shift_swap_requests_target_shift_id_fkey(
          id,
          employee_id,
          shift_template_id,
          start_time,
          end_time,
          status,
          employee:employees!shifts_employee_id_fkey(
            id,
            first_name,
            last_name,
            employee_id
          )
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching swap request:', error)
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    // Check permissions - employees can only see their own swap requests
    if (user?.role !== 'admin') {
      const isRequester = swapRequest.requester_shift?.employee_id === user?.id
      const isTarget = swapRequest.target_shift?.employee_id === user?.id
      
      if (!isRequester && !isTarget) {
        return NextResponse.json({ error: 'Forbidden: Can only access own swap requests' }, { status: 403 })
      }
    }

    return NextResponse.json({ swapRequest })

  } catch (error) {
    console.error('Error in GET /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts/swap-requests/[id]
 * Update a swap request (approve/reject/cancel)
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

    const body = await request.json()
    
    // Validate input
    const validationResult = updateSwapRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { status, admin_notes } = validationResult.data

    // Get the current swap request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id,
        requester_shift_id,
        target_shift_id,
        status,
        requester_shift:shifts!shift_swap_requests_requester_shift_id_fkey(
          id,
          employee_id
        ),
        target_shift:shifts!shift_swap_requests_target_shift_id_fkey(
          id,
          employee_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    // Check permissions
    if (user?.role !== 'admin') {
      const isRequester = currentRequest.requester_shift?.employee_id === user?.id
      const isTarget = currentRequest.target_shift?.employee_id === user?.id
      
      // Employees can only cancel their own requests or approve/reject requests involving their shifts
      if (!isRequester && !isTarget) {
        return NextResponse.json({ error: 'Forbidden: Can only manage own swap requests' }, { status: 403 })
      }
      
      // Only admins can approve/reject requests
      if (status === 'approved' || status === 'rejected') {
        return NextResponse.json({ error: 'Forbidden: Only admins can approve/reject requests' }, { status: 403 })
      }
      
      // Employees can only cancel pending requests
      if (status === 'cancelled' && currentRequest.status !== 'pending') {
        return NextResponse.json({ error: 'Can only cancel pending requests' }, { status: 400 })
      }
    }

    // Update the swap request
    const updateData: any = { status }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('shift_swap_requests')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        requester_shift_id,
        target_shift_id,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating swap request:', updateError)
      return NextResponse.json({ error: 'Failed to update swap request' }, { status: 500 })
    }

    // If approved, swap the shifts
    if (status === 'approved') {
      const { error: swapError } = await supabase
        .from('shifts')
        .update({ employee_id: currentRequest.target_shift?.employee_id })
        .eq('id', currentRequest.requester_shift_id)

      if (swapError) {
        console.error('Error swapping requester shift:', swapError)
      } else {
        const { error: swapError2 } = await supabase
          .from('shifts')
          .update({ employee_id: currentRequest.requester_shift?.employee_id })
          .eq('id', currentRequest.target_shift_id)

        if (swapError2) {
          console.error('Error swapping target shift:', swapError2)
        }
      }
    }

    return NextResponse.json({ 
      swapRequest: updatedRequest,
      message: `Swap request ${status} successfully` 
    })

  } catch (error) {
    console.error('Error in PUT /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts/swap-requests/[id]
 * Delete a swap request (only for pending requests)
 */
export async function DELETE(
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

    // Get the current swap request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('shift_swap_requests')
      .select(`
        id,
        status,
        requester_shift:shifts!shift_swap_requests_requester_shift_id_fkey(
          id,
          employee_id
        )
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    // Check permissions
    if (user?.role !== 'admin') {
      const isRequester = currentRequest.requester_shift?.employee_id === user?.id
      
      if (!isRequester) {
        return NextResponse.json({ error: 'Forbidden: Can only delete own swap requests' }, { status: 403 })
      }
    }

    // Only allow deletion of pending requests
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending requests' }, { status: 400 })
    }

    // Delete the swap request
    const { error: deleteError } = await supabase
      .from('shift_swap_requests')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting swap request:', deleteError)
      return NextResponse.json({ error: 'Failed to delete swap request' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Swap request deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 