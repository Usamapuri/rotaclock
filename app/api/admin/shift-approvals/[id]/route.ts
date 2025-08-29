import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift approval actions
const approvalSchema = z.object({
  action: z.enum(['approve', 'reject', 'edit']),
  approved_hours: z.number().min(0).optional(),
  approved_rate: z.number().min(0).optional(),
  admin_notes: z.string().optional(),
  rejection_reason: z.string().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate the request
    const authMiddleware = createApiAuthMiddleware()
    const authResult = await authMiddleware(request)
    if (!('isAuthenticated' in authResult) || !authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    const shiftId = params.id
    const body = await request.json()
    const validatedData = approvalSchema.parse(body)

    // Get the current shift log
    const shiftResult = await query(
      'SELECT * FROM shift_logs WHERE id = $1',
      [shiftId]
    )

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const shift = shiftResult.rows[0]
    const now = new Date().toISOString()

    // Get employee's default hourly rate
    const employeeResult = await query(
      'SELECT hourly_rate FROM employees_new WHERE id = $1',
      [shift.employee_id]
    )
    const defaultRate = employeeResult.rows[0]?.hourly_rate || 0

    let approvalStatus = ''
    let approvedHours = 0
    let approvedRate = 0
    let totalPay = 0

    if (validatedData.action === 'approve') {
      approvalStatus = 'approved'
      approvedHours = validatedData.approved_hours || shift.total_shift_hours
      approvedRate = validatedData.approved_rate || defaultRate
      totalPay = approvedHours * approvedRate
    } else if (validatedData.action === 'reject') {
      approvalStatus = 'rejected'
      if (!validatedData.rejection_reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }
    } else if (validatedData.action === 'edit') {
      approvalStatus = 'edited'
      approvedHours = validatedData.approved_hours || shift.total_shift_hours
      approvedRate = validatedData.approved_rate || defaultRate
      totalPay = approvedHours * approvedRate
    }

    // Update the shift log
    const updateResult = await query(
      `UPDATE shift_logs SET 
        approval_status = $1,
        approved_by = $2,
        approved_at = $3,
        approved_hours = $4,
        approved_rate = $5,
        total_pay = $6,
        admin_notes = $7,
        rejection_reason = $8,
        updated_at = NOW()
      WHERE id = $9 RETURNING *`,
      [
        approvalStatus,
        authResult.user.id,
        now,
        approvedHours,
        approvedRate,
        totalPay,
        validatedData.admin_notes || null,
        validatedData.rejection_reason || null,
        shiftId
      ]
    )

    const updatedShift = updateResult.rows[0]

    // Create approval history record
    await query(
      `INSERT INTO shift_approvals (
        shift_log_id, employee_id, approver_id, action,
        original_hours, approved_hours, original_rate, approved_rate,
        notes, rejection_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        shiftId,
        shift.employee_id,
        authResult.user.id,
        validatedData.action,
        shift.total_shift_hours,
        approvedHours,
        defaultRate,
        approvedRate,
        validatedData.admin_notes || null,
        validatedData.rejection_reason || null
      ]
    )

    // Create notification for employee
    let notificationMessage = ''
    let notificationType = ''

    if (validatedData.action === 'approve') {
      notificationMessage = `Your shift on ${new Date(shift.clock_in_time).toLocaleDateString()} has been approved. Hours: ${approvedHours}, Rate: £${approvedRate}/hr, Total: £${totalPay.toFixed(2)}`
      notificationType = 'success'
    } else if (validatedData.action === 'reject') {
      notificationMessage = `Your shift on ${new Date(shift.clock_in_time).toLocaleDateString()} has been rejected. Reason: ${validatedData.rejection_reason}`
      notificationType = 'error'
    } else if (validatedData.action === 'edit') {
      notificationMessage = `Your shift on ${new Date(shift.clock_in_time).toLocaleDateString()} has been edited. Hours: ${approvedHours}, Rate: £${approvedRate}/hr, Total: £${totalPay.toFixed(2)}`
      notificationType = 'info'
    }

    if (notificationMessage) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type, read, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          shift.employee_id,
          `Shift ${validatedData.action.charAt(0).toUpperCase() + validatedData.action.slice(1)}`,
          notificationMessage,
          notificationType,
          false,
          '/employee/dashboard'
        ]
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedShift,
      message: `Shift ${validatedData.action} successfully`
    })

  } catch (error) {
    console.error('Error processing shift approval:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process shift approval' },
      { status: 500 }
    )
  }
}
