import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const approveLeaveRequestSchema = z.object({
  action: z.enum(['approve', 'reject']),
  admin_notes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leaveRequestId } = await params
    
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = approveLeaveRequestSchema.parse(body)

    // Get leave request details with employee location
    const leaveRequestQuery = `
      SELECT 
        lr.*, 
        e.location_id,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        e.email as employee_email
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = $1 AND lr.tenant_id = $2
    `
    const leaveRequestResult = await query(leaveRequestQuery, [leaveRequestId, tenantContext.tenant_id])
    
    if (leaveRequestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      )
    }

    const leaveRequest = leaveRequestResult.rows[0]

    // Check if manager has access to employee's location
    const managerLocationCheck = await query(`
      SELECT 1 FROM manager_locations 
      WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
    `, [tenantContext.tenant_id, user.id, leaveRequest.location_id])

    if (managerLocationCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only approve leave requests for employees in your assigned locations.' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const approvalStatus = validatedData.action === 'approve' ? 'approved' : 'rejected'
    
    // Update the leave request
    const updateQuery = `
      UPDATE leave_requests SET
        status = $1,
        approved_by = $2,
        approved_at = $3,
        admin_notes = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `
    const updateResult = await query(updateQuery, [
      approvalStatus,
      user.id,
      now,
      validatedData.admin_notes || null,
      leaveRequestId
    ])

    // Create notification for employee
    const notificationType = approvalStatus === 'approved' ? 'success' : 'warning'
    const notificationMessage = approvalStatus === 'approved'
      ? `Your leave request from ${new Date(leaveRequest.start_date).toLocaleDateString()} to ${new Date(leaveRequest.end_date).toLocaleDateString()} has been approved.`
      : `Your leave request from ${new Date(leaveRequest.start_date).toLocaleDateString()} to ${new Date(leaveRequest.end_date).toLocaleDateString()} has been rejected. Reason: ${validatedData.admin_notes || 'Not specified'}`

    await query(`
      INSERT INTO notifications (tenant_id, user_id, title, message, type, read, action_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      tenantContext.tenant_id,
      leaveRequest.employee_id,
      `Leave Request ${validatedData.action.charAt(0).toUpperCase() + validatedData.action.slice(1)}d`,
      notificationMessage,
      notificationType,
      false,
      '/employee/profile'
    ])

    return NextResponse.json({
      success: true,
      data: {
        leaveRequest: updateResult.rows[0],
        message: `Leave request ${validatedData.action}d successfully`
      }
    })

  } catch (error) {
    console.error('Error in leave request approval:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
