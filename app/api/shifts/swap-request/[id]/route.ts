import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/auth'

const authMiddleware = createApiAuthMiddleware()

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is team lead
    if (authResult.user.role !== 'team_lead') {
      return NextResponse.json({ error: 'Team lead access required' }, { status: 403 })
    }

    const { id } = await params
    const { action, admin_notes } = await request.json() // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Get the swap request
    const swapResult = await query(`
      SELECT ss.*, 
             r.first_name as requester_first_name, r.last_name as requester_last_name,
             t.first_name as target_first_name, t.last_name as target_last_name,
             os.name as original_shift_name, rs.name as requested_shift_name
      FROM shift_swaps ss
      JOIN employees r ON ss.requester_id = r.id
      JOIN employees t ON ss.target_id = t.id
      JOIN shifts os ON ss.original_shift_id = os.id
      JOIN shifts rs ON ss.requested_shift_id = rs.id
      WHERE ss.id = $1
    `, [id])

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
    await query(`
      UPDATE shift_swaps 
      SET status = $1, approved_by = $2, approved_at = NOW(), admin_notes = $3, updated_at = NOW()
      WHERE id = $4
    `, [newStatus, authResult.user.id, admin_notes || null, id])

    // If approved, swap the shifts
    if (action === 'approve') {
      // Get the shift assignments for the swap date
      const requesterAssignmentResult = await query(`
        SELECT sa.id, sa.shift_id
        FROM shift_assignments sa
        WHERE sa.employee_id = $1 AND sa.shift_id = $2
        LIMIT 1
      `, [swapRequest.requester_id, swapRequest.original_shift_id])

      const targetAssignmentResult = await query(`
        SELECT sa.id, sa.shift_id
        FROM shift_assignments sa
        WHERE sa.employee_id = $1 AND sa.shift_id = $2
        LIMIT 1
      `, [swapRequest.target_id, swapRequest.requested_shift_id])

      if (requesterAssignmentResult.rows.length > 0 && targetAssignmentResult.rows.length > 0) {
        // Swap the shifts
        await query(`
          UPDATE shift_assignments 
          SET shift_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [swapRequest.requested_shift_id, requesterAssignmentResult.rows[0].id])

        await query(`
          UPDATE shift_assignments 
          SET shift_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [swapRequest.original_shift_id, targetAssignmentResult.rows[0].id])
      }
    }

    // Create notifications for all parties
    const notificationRecipients = [
      // Admin
      { user_id: 'ADM001', title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Rejected'}`, message: `Team lead ${authResult.user.first_name} ${authResult.user.last_name} ${action}ed the shift swap request between ${swapRequest.requester_first_name} ${swapRequest.requester_last_name} and ${swapRequest.target_first_name} ${swapRequest.target_last_name}`, type: action === 'approve' ? 'success' : 'warning' },
      // Project Manager
      { user_id: 'PM001', title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Rejected'}`, message: `Team lead ${authResult.user.first_name} ${authResult.user.last_name} ${action}ed the shift swap request between ${swapRequest.requester_first_name} ${swapRequest.requester_last_name} and ${swapRequest.target_first_name} ${swapRequest.target_last_name}`, type: action === 'approve' ? 'success' : 'warning' },
      // Requester
      { user_id: swapRequest.requester_id, title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Rejected'}`, message: `Your shift swap request with ${swapRequest.target_first_name} ${swapRequest.target_last_name} has been ${action}ed by your team lead`, type: action === 'approve' ? 'success' : 'warning' },
      // Target
      { user_id: swapRequest.target_id, title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Rejected'}`, message: `The shift swap request from ${swapRequest.requester_first_name} ${swapRequest.requester_last_name} has been ${action}ed by your team lead`, type: action === 'approve' ? 'success' : 'warning' }
    ]

    for (const notification of notificationRecipients) {
      await query(`
        INSERT INTO notifications (
          user_id, title, message, type, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [notification.user_id, notification.title, notification.message, notification.type])
    }

    return NextResponse.json({
      success: true,
      message: `Shift swap request ${action}ed successfully`,
      data: { status: newStatus }
    })

  } catch (error) {
    console.error('Error processing shift swap request:', error)
    return NextResponse.json(
      { error: 'Failed to process shift swap request' },
      { status: 500 }
    )
  }
}
