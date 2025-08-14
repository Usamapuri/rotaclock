import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
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

    // Get the leave request with related data
    const leaveRequestResult = await query(`
      SELECT 
        lr.id,
        lr.employee_id,
        lr.type as leave_type,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.reason,
        lr.status,
        lr.admin_notes,
        lr.created_at,
        lr.updated_at,
        json_build_object(
          'id', e.id,
          'first_name', e.first_name,
          'last_name', e.last_name,
          'employee_id', e.employee_id,
          'department', e.department
        ) as employee
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = $1
    `, [id])

    if (leaveRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const leaveRequest = leaveRequestResult.rows[0]

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
    const currentRequestResult = await query(`
      SELECT id, employee_id, status
      FROM leave_requests
      WHERE id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

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

    // Build update query
    let updateQuery = `UPDATE leave_requests SET status = $1, updated_at = NOW()`
    const updateParams = [status, id]
    let paramIndex = 3

    if (admin_notes !== undefined) {
      updateQuery += `, admin_notes = $${paramIndex}`
      updateParams.push(admin_notes)
      paramIndex++
    }

    updateQuery += ` WHERE id = $2 RETURNING *`

    // Update the leave request
    const updatedRequestResult = await query(updateQuery, updateParams)

    return NextResponse.json({ 
      leaveRequest: updatedRequestResult.rows[0],
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

    // Get the current leave request
    const currentRequestResult = await query(`
      SELECT id, employee_id, status
      FROM leave_requests
      WHERE id = $1
    `, [id])

    if (currentRequestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const currentRequest = currentRequestResult.rows[0]

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
    await query(`
      DELETE FROM leave_requests WHERE id = $1
    `, [id])

    return NextResponse.json({ 
      message: 'Leave request deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/employees/leave-requests/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 