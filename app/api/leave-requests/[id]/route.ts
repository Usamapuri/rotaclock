import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

/**
 * PATCH /api/leave-requests/[id] — approve/reject a leave request.
 * Role-scoped: admin/super_admin may act on any employee in the tenant;
 * manager may act only on employees in their assigned locations. This is the
 * single canonical approval endpoint (replaces admin/leave-requests/[id] and
 * manager/approvals/leave-request/[id]).
 */
const schema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional(),
  admin_notes: z.string().optional(),
  manager_notes: z.string().optional(),
  rejection_reason: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager') {
      return NextResponse.json({ success: false, error: 'Access denied. Admin or manager role required.' }, { status: 403 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const { id } = await params
    const validatedData = schema.parse(await request.json())

    // Load the request (with employee location for the manager scope check).
    const leaveRequestResult = await query(
      `SELECT lr.*, e.location_id, e.first_name, e.last_name, e.email
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id AND e.tenant_id = lr.tenant_id
       WHERE lr.id = $1 AND lr.tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )
    if (leaveRequestResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 })
    }
    const leaveRequest = leaveRequestResult.rows[0]

    // Managers may only act on employees in their assigned locations.
    if (user.role === 'manager') {
      const locCheck = await query(
        `SELECT 1 FROM manager_locations WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3`,
        [tenantContext.tenant_id, user.id, leaveRequest.location_id]
      )
      if (locCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only act on leave requests for employees in your assigned locations.' },
          { status: 403 }
        )
      }
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Leave request has already been processed' }, { status: 400 })
    }

    const newStatus = validatedData.action === 'approve' ? 'approved' : 'rejected'
    const noteText = validatedData.notes ?? validatedData.admin_notes ?? validatedData.manager_notes ?? null
    const rejectionReason = validatedData.rejection_reason ?? (validatedData.action === 'reject' ? noteText : null)

    const updateResult = await query(
      `UPDATE leave_requests SET
         status = $1, approved_by = $2, approved_at = NOW(),
         admin_notes = $3, rejection_reason = $4, updated_at = NOW()
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [newStatus, user.id, noteText, rejectionReason, id, tenantContext.tenant_id]
    )

    // Notify the employee.
    const notificationMessage = validatedData.action === 'approve'
      ? `Your leave request for ${leaveRequest.start_date} to ${leaveRequest.end_date} has been approved.`
      : `Your leave request for ${leaveRequest.start_date} to ${leaveRequest.end_date} has been rejected.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`
    await query(
      `INSERT INTO notifications (tenant_id, user_id, title, message, type, read, action_url)
       VALUES ($1, $2, $3, $4, $5, false, '/employee/profile')`,
      [
        tenantContext.tenant_id,
        leaveRequest.employee_id,
        `Leave Request ${validatedData.action === 'approve' ? 'Approved' : 'Rejected'}`,
        notificationMessage,
        validatedData.action === 'approve' ? 'success' : 'warning',
      ]
    )

    // On approval, best-effort cancel overlapping shifts (don't fail the
    // approval if the columns/states differ).
    if (validatedData.action === 'approve') {
      try {
        await query(
          `UPDATE shift_assignments SET status = 'cancelled', updated_at = NOW()
           WHERE employee_id = $1 AND tenant_id = $2 AND date BETWEEN $3 AND $4
           AND status NOT IN ('cancelled')`,
          [leaveRequest.employee_id, tenantContext.tenant_id, leaveRequest.start_date, leaveRequest.end_date]
        )
      } catch (e) {
        console.warn('Leave approval: shift cancellation skipped:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: `Leave request ${validatedData.action}d successfully`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error in PATCH /api/leave-requests/[id]:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
