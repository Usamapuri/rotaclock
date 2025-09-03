import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const authMiddleware = createApiAuthMiddleware()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request)
    if (!('isAuthenticated' in authResult) || !authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is team lead
    if (authResult.user.role !== 'team_lead') {
      return NextResponse.json({ error: 'Team lead access required' }, { status: 403 })
    }

    const tenantContext = await getTenantContext(authResult.user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { id } = await params
    const { action, admin_notes } = await request.json() // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get the swap request in tenant
    const swapResult = await query(
      `SELECT ss.*, 
              r.first_name as requester_first_name, r.last_name as requester_last_name,
              t.first_name as target_first_name, t.last_name as target_last_name
       FROM shift_swaps ss
       JOIN employees_new r ON ss.requester_id = r.id AND r.tenant_id = ss.tenant_id
       JOIN employees_new t ON ss.target_id = t.id AND t.tenant_id = ss.tenant_id
       WHERE ss.id = $1 AND ss.tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (swapResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Swap request not found' },
        { status: 404 }
      )
    }

    const swapRequest = swapResult.rows[0]

    if (swapRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Swap request has already been processed' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update the swap request
    await query(
      `UPDATE shift_swaps 
       SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [newStatus, authResult.user.id, admin_notes || null, id, tenantContext.tenant_id]
    )

    // If approved, swap the assignments in tenant
    if (action === 'approve') {
      const requesterAssignmentResult = await query(
        `SELECT sa.id, sa.template_id
         FROM shift_assignments_new sa
         WHERE sa.employee_id = $1 AND sa.template_id = $2 AND sa.tenant_id = $3
         LIMIT 1`,
        [swapRequest.requester_id, swapRequest.original_shift_id, tenantContext.tenant_id]
      )

      const targetAssignmentResult = await query(
        `SELECT sa.id, sa.template_id
         FROM shift_assignments_new sa
         WHERE sa.employee_id = $1 AND sa.template_id = $2 AND sa.tenant_id = $3
         LIMIT 1`,
        [swapRequest.target_id, swapRequest.requested_shift_id, tenantContext.tenant_id]
      )

      if (requesterAssignmentResult.rows.length > 0 && targetAssignmentResult.rows.length > 0) {
        await query(
          `UPDATE shift_assignments_new 
           SET template_id = $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [swapRequest.requested_shift_id, requesterAssignmentResult.rows[0].id, tenantContext.tenant_id]
        )

        await query(
          `UPDATE shift_assignments_new 
           SET template_id = $1, updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [swapRequest.original_shift_id, targetAssignmentResult.rows[0].id, tenantContext.tenant_id]
        )
      }
    }

    // Minimal notifications per tenant could be added here if needed

    return NextResponse.json({
      success: true,
      message: `Shift swap request ${action}ed successfully`,
      data: { status: newStatus },
    })
  } catch (error) {
    console.error('Error processing shift swap request:', error)
    return NextResponse.json(
      { error: 'Failed to process shift swap request' },
      { status: 500 }
    )
  }
}
