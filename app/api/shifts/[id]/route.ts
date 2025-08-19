import { NextRequest, NextResponse } from 'next/server'
import { query, getShift } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

/**
 * GET /api/shifts/[id]
 * Get a specific shift by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const result = await query(`
      SELECT s.*, 
             e.id as employee_id, 
             e.first_name, 
             e.last_name, 
             e.email
      FROM shifts s
      LEFT JOIN employees e ON s.created_by = e.id
      WHERE s.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    const shift = result.rows[0]

    return NextResponse.json({ shift })

  } catch (error) {
    console.error('Error in GET /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/shifts/[id]
 * Update a shift
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active } = body

    // Check if shift exists
    const existingShiftResult = await query(`
      SELECT id, name, start_time, end_time, department
      FROM shifts
      WHERE id = $1
    `, [id])

    if (existingShiftResult.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Validate times if provided
    if (start_time && end_time) {
      if (start_time >= end_time) {
        return NextResponse.json({ 
          error: 'End time must be after start time' 
        }, { status: 400 })
      }
    }

    // Build update query
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`)
      updateValues.push(name)
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(description)
    }
    if (start_time !== undefined) {
      updateFields.push(`start_time = $${paramIndex++}`)
      updateValues.push(start_time)
    }
    if (end_time !== undefined) {
      updateFields.push(`end_time = $${paramIndex++}`)
      updateValues.push(end_time)
    }
    if (department !== undefined) {
      updateFields.push(`department = $${paramIndex++}`)
      updateValues.push(department)
    }
    if (required_staff !== undefined) {
      updateFields.push(`required_staff = $${paramIndex++}`)
      updateValues.push(required_staff)
    }
    if (hourly_rate !== undefined) {
      updateFields.push(`hourly_rate = $${paramIndex++}`)
      updateValues.push(hourly_rate)
    }
    if (color !== undefined) {
      updateFields.push(`color = $${paramIndex++}`)
      updateValues.push(color)
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`)
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updateValues.push(id)
    const updateQuery = `
      UPDATE shifts 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query(updateQuery, updateValues)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 })
    }

    const shift = result.rows[0]

    return NextResponse.json({ 
      shift,
      message: 'Shift updated successfully' 
    })

  } catch (error) {
    console.error('Error in PATCH /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts/[id]
 * Delete a shift
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if shift exists and has assignments
    const assignmentResult = await query(`
      SELECT COUNT(*) as assignment_count
      FROM shift_assignments
      WHERE shift_id = $1
    `, [id])

    if (parseInt(assignmentResult.rows[0].assignment_count) > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete shift that has assignments. Please remove assignments first.' 
      }, { status: 400 })
    }

    // Delete shift
    const result = await query(`
      DELETE FROM shifts
      WHERE id = $1
      RETURNING id
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Shift deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/shifts/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
 