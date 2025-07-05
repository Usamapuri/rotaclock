import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating leave requests
const updateLeaveRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  admin_notes: z.string().optional()
})

/**
 * GET /api/employees/leave-requests/[id]
 * Get a specific leave request
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

    // Get the leave request with related data
    const { data: leaveRequest, error } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at,
        employee:employees!leave_requests_employee_id_fkey(
          id,
          first_name,
          last_name,
          employee_id,
          department
        )
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching leave request:', error)
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check permissions - employees can only see their own leave requests
    if (user?.role !== 'admin' && leaveRequest.employee_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access own leave requests' }, { status: 403 })
    }

    return NextResponse.json({ leaveRequest })

  } catch (error) {
    console.error('Error in GET /api/employees/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/employees/leave-requests/[id]
 * Update a leave request (approve/reject/cancel)
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
    const validationResult = updateLeaveRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const { status, admin_notes } = validationResult.data

    // Get the current leave request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        status
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check permissions
    if (user?.role !== 'admin') {
      // Employees can only cancel their own pending requests
      if (currentRequest.employee_id !== user?.id) {
        return NextResponse.json({ error: 'Forbidden: Can only manage own leave requests' }, { status: 403 })
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

    // Update the leave request
    const updateData: any = { status }
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        reason,
        status,
        admin_notes,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating leave request:', updateError)
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
    }

    return NextResponse.json({ 
      leaveRequest: updatedRequest,
      message: `Leave request ${status} successfully` 
    })

  } catch (error) {
    console.error('Error in PUT /api/employees/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/employees/leave-requests/[id]
 * Delete a leave request (only for pending requests)
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

    // Get the current leave request
    const { data: currentRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        status
      `)
      .eq('id', params.id)
      .single()

    if (fetchError || !currentRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    // Check permissions
    if (user?.role !== 'admin') {
      if (currentRequest.employee_id !== user?.id) {
        return NextResponse.json({ error: 'Forbidden: Can only delete own leave requests' }, { status: 403 })
      }
    }

    // Only allow deletion of pending requests
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending requests' }, { status: 400 })
    }

    // Delete the leave request
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting leave request:', deleteError)
      return NextResponse.json({ error: 'Failed to delete leave request' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Leave request deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/employees/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 