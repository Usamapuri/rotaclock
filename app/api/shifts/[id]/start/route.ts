import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

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
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if shift exists and get current status
    const shiftResult = await query(`
      SELECT id, status, employee_id, start_time, end_time
      FROM shifts
      WHERE id = $1
    `, [id])

    if (shiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const shift = shiftResult.rows[0]

    // Check if user is the employee assigned to this shift
    const employeeResult = await query(`
      SELECT id FROM employees WHERE user_id = $1
    `, [user.id])

    if (employeeResult.rows.length === 0 || employeeResult.rows[0].id !== shift.employee_id) {
      return NextResponse.json({ error: 'You can only start your own shifts' }, { status: 403 })
    }

    // Validate shift status
    if (shift.status !== 'scheduled') {
      return NextResponse.json({ 
        error: `Cannot start shift with status: ${shift.status}` 
      }, { status: 400 })
    }

    // Check if shift time is appropriate (within 15 minutes of start time)
    const now = new Date()
    const startTime = new Date(shift.start_time)
    const timeDiff = Math.abs(now.getTime() - startTime.getTime()) / (1000 * 60) // minutes

    if (timeDiff > 15) {
      return NextResponse.json({ 
        error: 'Shift can only be started within 15 minutes of the scheduled start time' 
      }, { status: 400 })
    }

    // Check if employee has any other active shifts
    const activeShiftsResult = await query(`
      SELECT id FROM shifts
      WHERE employee_id = $1 AND status = 'in-progress'
    `, [shift.employee_id])

    if (activeShiftsResult.rows.length > 0) {
      return NextResponse.json({ 
        error: 'You already have an active shift. Please end it before starting a new one.' 
      }, { status: 400 })
    }

    // Start the shift
    const updatedShiftResult = await query(`
      UPDATE shifts
      SET status = 'in-progress', start_time = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [now.toISOString(), id])

    return NextResponse.json({ 
      shift: updatedShiftResult.rows[0],
      message: 'Shift started successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/start:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 