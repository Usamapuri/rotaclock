import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating swap requests
const updateSwapRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'denied', 'cancelled']),
  admin_notes: z.string().optional()
})

/**
 * GET /api/shifts/swap-requests/[id]
 * Get a specific swap request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the swap request with related data
    const swapRequestResult = await query(`
      SELECT 
        ss.*,
        r.first_name as requester_first_name,
        r.last_name as requester_last_name,
        r.email as requester_email,
        t.first_name as target_first_name,
        t.last_name as target_last_name,
        t.email as target_email,
        aba.first_name as approved_by_first_name,
        aba.last_name as approved_by_last_name,
        aba.email as approved_by_email
      FROM shift_swaps ss
      LEFT JOIN employees r ON ss.requester_id = r.id
      LEFT JOIN employees t ON ss.target_id = t.id
      LEFT JOIN employees aba ON ss.approved_by = aba.id
      WHERE ss.id = $1
    `, [id])

    if (swapRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    const swapRequest = swapRequestResult.rows[0]

    // Check permissions - employees can only see their own swap requests
    if (user?.role !== 'admin') {
      const isRequester = swapRequest.requester_id === user?.id
      const isTarget = swapRequest.target_id === user?.id
      
      if (!isRequester && !isTarget) {
        return NextResponse.json({ error: 'Forbidden: Can only access own swap requests' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: swapRequest })

  } catch (error) {
    console.error('Error in GET /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/shifts/swap-requests/[id]
 * Update a swap request (approve/deny/cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update swap requests
    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can update swap requests' }, { status: 403 })
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
    const currentRequestResult = await query(`
      SELECT 
        ss.id,
        ss.requester_id,
        ss.target_id,
        ss.original_shift_id,
        ss.requested_shift_id,
        ss.status
      FROM shift_swaps ss
      WHERE ss.id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

    // Update the swap request
    const updateData: any = { 
      status,
      updated_at: new Date()
    }
    
    if (status === 'approved' || status === 'denied') {
      updateData.approved_by = user.id
      updateData.approved_at = new Date()
    }
    
    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }

    const updateFields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const updateValues = Object.values(updateData)

    const updatedRequestResult = await query(`
      UPDATE shift_swaps
      SET ${updateFields}
      WHERE id = $1
      RETURNING *
    `, [id, ...updateValues])

    const updatedRequest = updatedRequestResult.rows[0]

    // If approved, swap the shift assignments
    if (status === 'approved') {
      try {
        // Swap the employee assignments
        await query(`
          UPDATE shift_assignments 
          SET employee_id = $1 
          WHERE id = $2
        `, [currentRequest.target_id, currentRequest.original_shift_id])

        await query(`
          UPDATE shift_assignments 
          SET employee_id = $1 
          WHERE id = $2
        `, [currentRequest.requester_id, currentRequest.requested_shift_id])
      } catch (swapError) {
        console.error('Error swapping shift assignments:', swapError)
      }
    }

    return NextResponse.json({ 
      data: updatedRequest,
      message: `Swap request ${status} successfully` 
    })

  } catch (error) {
    console.error('Error in PATCH /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts/swap-requests/[id]
 * Update a swap request (approve/reject/cancel) - legacy method
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Redirect to PATCH method
  return PATCH(request, { params })
}

/**
 * DELETE /api/shifts/swap-requests/[id]
 * Delete a swap request (only for pending requests)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the current swap request
    const currentRequestResult = await query(`
      SELECT 
        ss.id,
        ss.status,
        ss.requester_id
      FROM shift_swaps ss
      WHERE ss.id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

    // Check permissions
    if (user?.role !== 'admin') {
      const isRequester = currentRequest.requester_id === user?.id
      
      if (!isRequester) {
        return NextResponse.json({ error: 'Forbidden: Can only delete own swap requests' }, { status: 403 })
      }
    }

    // Only allow deletion of pending requests
    if (currentRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Can only delete pending requests' }, { status: 400 })
    }

    // Delete the swap request
    await query(`
      DELETE FROM shift_swaps
      WHERE id = $1
    `, [id])

    return NextResponse.json({ 
      message: 'Swap request deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/shifts/swap-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 