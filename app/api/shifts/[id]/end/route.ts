import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

/**
 * POST /api/shifts/[id]/end
 * End a shift
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
    if (!user) {
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
      return NextResponse.json({ error: 'You can only end your own shifts' }, { status: 403 })
    }

    // Validate shift status
    if (shift.status !== 'in-progress') {
      return NextResponse.json({ 
        error: `Cannot end shift with status: ${shift.status}` 
      }, { status: 400 })
    }

    // End the shift
    const updatedShiftResult = await query(`
      UPDATE shifts
      SET status = 'completed', end_time = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [new Date().toISOString(), id])

    return NextResponse.json({ 
      shift: updatedShiftResult.rows[0],
      message: 'Shift ended successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/end:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 