import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employee_id, shift_id, date, notes, assigned_by } = body

    // Validate required fields
    if (!employee_id || !shift_id || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employee_id, shift_id, date' },
        { status: 400 }
      )
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Check if employee exists and is active
    const employeeResult = await query(
      'SELECT id, first_name, last_name FROM employees_new WHERE id = $1 AND is_active = true',
      [employee_id]
    )

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found or inactive' },
        { status: 404 }
      )
    }

    // Check if shift template exists and is active
    const shiftResult = await query(
      'SELECT id, name FROM shift_templates WHERE id = $1 AND is_active = true',
      [shift_id]
    )

    if (shiftResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift not found or inactive' },
        { status: 404 }
      )
    }

    // Check for existing assignment on the same date
    const existingAssignment = await query(
      'SELECT id FROM shift_assignments_new WHERE employee_id = $1 AND date = $2',
      [employee_id, date]
    )

    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Employee already has an assignment on this date' },
        { status: 409 }
      )
    }

    // Create the shift assignment
    const result = await query(`
      INSERT INTO shift_assignments_new (
        employee_id,
        template_id,
        date,
        status,
        notes,
        assigned_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'assigned', $4, $5, NOW(), NOW())
      RETURNING id, employee_id, template_id, date, status, notes, created_at
    `, [employee_id, shift_id, date, notes || null, assigned_by || null])

    const assignment = result.rows[0]

    // Get the full assignment details for response
    const fullAssignmentResult = await query(`
      SELECT 
        sa.id,
        sa.employee_id,
        sa.template_id,
        sa.date,
        sa.status,
        sa.notes,
        sa.created_at,
        e.first_name,
        e.last_name,
        e.employee_code,
        st.name as shift_name,
        st.start_time,
        st.end_time,
        st.color
      FROM shift_assignments_new sa
      JOIN employees_new e ON sa.employee_id = e.id
      JOIN shift_templates st ON sa.template_id = st.id
      WHERE sa.id = $1
    `, [assignment.id])

    return NextResponse.json({
      success: true,
      data: fullAssignmentResult.rows[0],
      message: 'Shift assigned successfully'
    })

  } catch (error) {
    console.error('Error assigning shift:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('id')

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Check if assignment exists
    const existingAssignment = await query(
      'SELECT id, employee_id, date FROM shift_assignments WHERE id = $1',
      [assignmentId]
    )

    if (existingAssignment.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Delete the assignment
    await query(
      'DELETE FROM shift_assignments WHERE id = $1',
      [assignmentId]
    )

    return NextResponse.json({
      success: true,
      message: 'Shift assignment removed successfully'
    })

  } catch (error) {
    console.error('Error removing shift assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove shift assignment' },
      { status: 500 }
    )
  }
}
