import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const approveShiftSwapSchema = z.object({
  action: z.enum(['approve', 'reject']),
  admin_notes: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: swapId } = await params
    
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
    const validatedData = approveShiftSwapSchema.parse(body)

    // Get shift swap details with employee locations
    const swapQuery = `
      SELECT 
        ss.*, 
        req.location_id as requester_location_id,
        tar.location_id as target_location_id,
        CONCAT(req.first_name, ' ', req.last_name) as requester_name,
        CONCAT(tar.first_name, ' ', tar.last_name) as target_name,
        req.email as requester_email,
        tar.email as target_email
      FROM shift_swaps ss
      JOIN employees req ON ss.requester_id = req.id
      JOIN employees tar ON ss.target_id = tar.id
      WHERE ss.id = $1 AND ss.tenant_id = $2
    `
    const swapResult = await query(swapQuery, [swapId, tenantContext.tenant_id])
    
    if (swapResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift swap request not found' },
        { status: 404 }
      )
    }

    const swapRequest = swapResult.rows[0]

    // Check if manager has access to both employee locations
    const requesterLocationCheck = await query(`
      SELECT 1 FROM manager_locations 
      WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
    `, [tenantContext.tenant_id, user.id, swapRequest.requester_location_id])

    const targetLocationCheck = await query(`
      SELECT 1 FROM manager_locations 
      WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
    `, [tenantContext.tenant_id, user.id, swapRequest.target_location_id])

    if (requesterLocationCheck.rows.length === 0 || targetLocationCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You can only approve shift swaps for employees in your assigned locations.' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()
    const approvalStatus = validatedData.action === 'approve' ? 'approved' : 'rejected'
    
    // Update the shift swap request
    const updateQuery = `
      UPDATE shift_swaps SET
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
      swapId
    ])

    // If approved, swap the shift assignments
    if (validatedData.action === 'approve') {
      await query(`
        BEGIN;
        
        -- Swap the employee_id fields of the two shift assignments
        UPDATE shift_assignments
        SET employee_id = CASE 
          WHEN id = $1 THEN $3
          WHEN id = $2 THEN $4
        END,
        updated_at = NOW()
        WHERE id IN ($1, $2);
        
        COMMIT;
      `, [
        swapRequest.original_shift_id,
        swapRequest.requested_shift_id,
        swapRequest.target_id,
        swapRequest.requester_id
      ])
    }

    // Create notifications for both employees
    const requesterNotificationType = approvalStatus === 'approved' ? 'success' : 'warning'
    const requesterNotificationMessage = approvalStatus === 'approved'
      ? `Your shift swap request has been approved. Your shifts have been swapped with ${swapRequest.target_name}.`
      : `Your shift swap request has been rejected. Reason: ${validatedData.admin_notes || 'Not specified'}`

    await query(`
      INSERT INTO notifications (tenant_id, user_id, title, message, type, read, action_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      tenantContext.tenant_id,
      swapRequest.requester_id,
      `Shift Swap ${validatedData.action.charAt(0).toUpperCase() + validatedData.action.slice(1)}d`,
      requesterNotificationMessage,
      requesterNotificationType,
      false,
      '/employee/scheduling'
    ])

    // Notify target employee (only if approved)
    if (validatedData.action === 'approve') {
      await query(`
        INSERT INTO notifications (tenant_id, user_id, title, message, type, read, action_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        tenantContext.tenant_id,
        swapRequest.target_id,
        'Shift Swap Approved',
        `A shift swap with ${swapRequest.requester_name} has been approved. Your shifts have been updated.`,
        'info',
        false,
        '/employee/scheduling'
      ])
    }

    return NextResponse.json({
      success: true,
      data: {
        swapRequest: updateResult.rows[0],
        message: `Shift swap ${validatedData.action}d successfully`
      }
    })

  } catch (error) {
    console.error('Error in shift swap approval:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
