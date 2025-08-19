import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for updating shift assignments
const updateShiftAssignmentSchema = z.object({
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['assigned', 'confirmed', 'completed', 'cancelled', 'swap-requested']).optional(),
  notes: z.string().optional()
})

/**
 * GET /api/shifts/assignments/[id]
 * Get a specific shift assignment
 */
export async function GET(
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

    // Get the shift assignment with related data
    const assignmentResult = await query(`
      SELECT 
        sa.*,
        e.first_name as employee_first_name,
        e.last_name as employee_last_name,
        e.email as employee_email,
        s.name as shift_name,
        s.start_time as shift_start_time,
        s.end_time as shift_end_time,
        aba.first_name as assigned_by_first_name,
        aba.last_name as assigned_by_last_name,
        aba.email as assigned_by_email
      FROM shift_assignments sa
      LEFT JOIN employees e ON sa.employee_id = e.id
      LEFT JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN employees aba ON sa.assigned_by = aba.id
      WHERE sa.id = $1
    `, [id])

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift assignment not found' }, { status: 404 })
    }

    const assignment = assignmentResult.rows[0]

    // Check permissions - employees can only see their own assignments
    if (user?.role !== 'admin' && assignment.employee_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access own shift assignments' }, { status: 403 })
    }

    return NextResponse.json({ data: assignment })

  } catch (error) {
    console.error('Error in GET /api/shifts/assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts/assignments/[id]
 * Update a shift assignment
 */
export async function PUT(
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

    const body = await request.json()
    
    // Validate input
    const validationResult = updateShiftAssignmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const updateData = validationResult.data

    // Get the current shift assignment
    const currentAssignmentResult = await query(`
      SELECT id, employee_id, status
      FROM shift_assignments
      WHERE id = $1
    `, [id])

    if (currentAssignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift assignment not found' }, { status: 404 })
    }

    const currentAssignment = currentAssignmentResult.rows[0]

    // Check permissions
    if (user?.role !== 'admin' && currentAssignment.employee_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden: Can only update own shift assignments' }, { status: 403 })
    }

    // Build update query
    const updateFields = Object.keys(updateData).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const updateValues = Object.values(updateData)

    const updatedAssignmentResult = await query(`
      UPDATE shift_assignments
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, ...updateValues])

    return NextResponse.json({ 
      data: updatedAssignmentResult.rows[0],
      message: 'Shift assignment updated successfully' 
    })

  } catch (error) {
    console.error('Error in PUT /api/shifts/assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts/assignments/[id]
 * Delete a shift assignment
 */
export async function DELETE(
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

    // Get the current shift assignment
    const currentAssignmentResult = await query(`
      SELECT id, employee_id, status
      FROM shift_assignments
      WHERE id = $1
    `, [id])

    if (currentAssignmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift assignment not found' }, { status: 404 })
    }

    const currentAssignment = currentAssignmentResult.rows[0]

    // Check permissions
    if (user?.role !== 'admin' && currentAssignment.employee_id !== user?.id) {
      return NextResponse.json({ error: 'Forbidden: Can only delete own shift assignments' }, { status: 403 })
    }

    // Only allow deletion of assigned or confirmed assignments
    if (currentAssignment.status === 'completed' || currentAssignment.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot delete completed or cancelled assignments' }, { status: 400 })
    }

    // Delete the shift assignment
    await query(`
      DELETE FROM shift_assignments
      WHERE id = $1
    `, [id])

    return NextResponse.json({ 
      message: 'Shift assignment deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/shifts/assignments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
