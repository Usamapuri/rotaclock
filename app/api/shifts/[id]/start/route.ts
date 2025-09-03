import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/**
 * POST /api/shifts/[id]/start
 * Start a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Check if shift exists and get current status (in tenant)
    const shiftResult = await query(
      `SELECT id, status, employee_id, date, start_time, end_time
       FROM shift_assignments
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const shift = shiftResult.rows[0]

    // Check if user is the employee assigned to this shift
    const employeeResult = await query(
      `SELECT id FROM employees WHERE id = $1 AND tenant_id = $2`,
      [user.id, tenantContext.tenant_id]
    )

    if (employeeResult.rows.length === 0 || employeeResult.rows[0].id !== shift.employee_id) {
      return NextResponse.json({ error: 'You can only start your own shifts' }, { status: 403 })
    }

    // Validate shift status
    if (shift.status !== 'scheduled') {
      return NextResponse.json({ error: `Cannot start shift with status: ${shift.status}` }, { status: 400 })
    }

    // Check if shift time is appropriate (within 15 minutes of start time)
    const now = new Date()
    const startTime = new Date(shift.start_time)
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60)

    if (timeDiff > 15) {
      return NextResponse.json({ error: 'Shift can only be started within 15 minutes of the scheduled start time' }, { status: 400 })
    }

    // Check if employee has any other active shifts in tenant
    const activeShiftsResult = await query(
      `SELECT id FROM shift_assignments WHERE employee_id = $1 AND status = 'in-progress' AND tenant_id = $2`,
      [shift.employee_id, tenantContext.tenant_id]
    )

    if (activeShiftsResult.rows.length > 0) {
      return NextResponse.json({ error: 'You already have an active shift. Please end it before starting a new one.' }, { status: 400 })
    }

    // Start the shift
    const updatedShiftResult = await query(
      `UPDATE shift_assignments
       SET status = 'in-progress', actual_start_time = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [now.toISOString(), id, tenantContext.tenant_id]
    )

    return NextResponse.json({ shift: updatedShiftResult.rows[0], message: 'Shift started successfully' })
  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/start:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 