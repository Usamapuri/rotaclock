import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

const authMiddleware = createApiAuthMiddleware()

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request)
    if (!('isAuthenticated' in authResult) || !authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { target_employee_id, reason, swap_date } = await request.json()
    const requester_id = authResult.user.id

    if (!target_employee_id || !reason || !swap_date) {
      return NextResponse.json(
        { error: 'Target employee ID, reason, and swap date are required' },
        { status: 400 }
      )
    }

    // Get the requester's shift for the swap date
    const requesterShiftResult = await query(`
      SELECT sa.id as assignment_id, sa.template_id, st.name as shift_name
      FROM shift_assignments_new sa
      JOIN shift_templates st ON sa.template_id = st.id
      WHERE sa.employee_id = $1 AND sa.date = $2
    `, [requester_id, swap_date])

    if (requesterShiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'You do not have a shift assigned on the requested date' },
        { status: 400 }
      )
    }

    const requesterShift = requesterShiftResult.rows[0]

    // Get the target employee's shift for the swap date
    const targetShiftResult = await query(`
      SELECT sa.id as assignment_id, sa.template_id, st.name as shift_name
      FROM shift_assignments_new sa
      JOIN shift_templates st ON sa.template_id = st.id
      WHERE sa.employee_id = $1 AND sa.date = $2
    `, [target_employee_id, swap_date])

    if (targetShiftResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Target employee does not have a shift assigned on the requested date' },
        { status: 400 }
      )
    }

    const targetShift = targetShiftResult.rows[0]

    // Check if a swap request already exists
    const existingSwapResult = await query(`
      SELECT id FROM shift_swaps 
      WHERE requester_id = $1 AND target_id = $2 AND original_shift_id = $3 AND requested_shift_id = $4
      AND status = 'pending'
    `, [requester_id, target_employee_id, requesterShift.template_id, targetShift.template_id])

    if (existingSwapResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'A swap request already exists for these shifts' },
        { status: 400 }
      )
    }

    // Create the swap request
    const swapResult = await query(`
      INSERT INTO shift_swaps (
        requester_id,
        target_id,
        original_shift_id,
        requested_shift_id,
        status,
        reason,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW(), NOW())
      RETURNING *
    `, [requester_id, target_employee_id, requesterShift.template_id, targetShift.template_id, reason])

    const swapRequest = swapResult.rows[0]

    // Get employee names for notifications
    const requesterResult = await query(`
      SELECT first_name, last_name FROM employees_new WHERE id = $1
    `, [requester_id])

    const targetResult = await query(`
      SELECT first_name, last_name FROM employees_new WHERE id = $1
    `, [target_employee_id])

    const requester = requesterResult.rows[0]
    const target = targetResult.rows[0]

    // Create notifications for all relevant parties
    const notificationRecipients = [
      // Admin
      { user_id: 'ADM001', title: 'Shift Swap Request', message: `${requester.first_name} ${requester.last_name} wants to swap ${requesterShift.shift_name} shift with ${target.first_name} ${target.last_name}'s ${targetShift.shift_name} shift on ${swap_date}`, type: 'info' },
      // Project Manager
      { user_id: 'PM001', title: 'Shift Swap Request', message: `${requester.first_name} ${requester.last_name} wants to swap ${requesterShift.shift_name} shift with ${target.first_name} ${target.last_name}'s ${targetShift.shift_name} shift on ${swap_date}`, type: 'info' },
      // Team Lead
      { user_id: 'TL001', title: 'Shift Swap Request', message: `${requester.first_name} ${requester.last_name} wants to swap ${requesterShift.shift_name} shift with ${target.first_name} ${target.last_name}'s ${targetShift.shift_name} shift on ${swap_date}`, type: 'info' },
      // Requester
      { user_id: requester_id, title: 'Shift Swap Request Sent', message: `Your swap request with ${target.first_name} ${target.last_name} for ${swap_date} is pending approval`, type: 'info' },
      // Target
      { user_id: target_employee_id, title: 'Shift Swap Request Received', message: `${requester.first_name} ${requester.last_name} wants to swap shifts with you on ${swap_date}`, type: 'info' }
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
      data: swapRequest,
      message: 'Shift swap request created successfully'
    })

  } catch (error) {
    console.error('Error creating shift swap request:', error)
    return NextResponse.json(
      { error: 'Failed to create shift swap request' },
      { status: 500 }
    )
  }
}
