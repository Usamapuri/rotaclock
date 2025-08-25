import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { employee_id, date, notes, assigned_by } = body
    // Support both legacy "shift_id" and current "template_id" from the client
    const template_id = body.template_id ?? body.shift_id
    // Optional per-assignment overrides
    const override_name = body.override_name ?? null
    const override_start_time = body.override_start_time ?? null
    const override_end_time = body.override_end_time ?? null
    const override_color = body.override_color ?? null

    // Validate required fields (either template_id or full overrides required)
    const hasTemplate = !!template_id
    const hasOverrides = !!(override_name && override_start_time && override_end_time)
    if (!employee_id || !date || (!hasTemplate && !hasOverrides)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employee_id, date and either template_id or override fields' },
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

    // If template is provided, validate; if not, we rely on overrides only
    if (hasTemplate) {
      const shiftResult = await query(
        'SELECT id, name FROM shift_templates WHERE id = $1 AND is_active = true',
        [template_id]
      )
      if (shiftResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Shift not found or inactive' },
          { status: 404 }
        )
      }
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

    // Check if override columns exist
    const colCheck = await query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'shift_assignments_new' AND column_name = 'override_name' LIMIT 1`
    )
    const hasOverrideCols = colCheck.rows.length > 0

    // If client sent overrides but DB doesn't support them, fail fast with guidance
    if (hasOverrides && !hasOverrideCols) {
      return NextResponse.json(
        { success: false, error: 'Custom shift overrides are not enabled. Run scripts/cleanup_db.sql to add override columns.' },
        { status: 400 }
      )
    }

    // Create the shift assignment (conditionally include overrides)
    let insertSql: string
    let insertParams: any[]
    if (hasOverrideCols) {
      insertSql = `
        INSERT INTO shift_assignments_new (
          employee_id,
          template_id,
          date,
          override_name,
          override_start_time,
          override_end_time,
          override_color,
          status,
          notes,
          assigned_by,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'assigned', $8, $9, NOW(), NOW())
        RETURNING id, employee_id, template_id, date, override_name, override_start_time, override_end_time, override_color, status, notes, created_at
      `
      insertParams = [employee_id, hasTemplate ? template_id : null, date, override_name, override_start_time, override_end_time, override_color, notes || null, assigned_by || null]
    } else {
      insertSql = `
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
      `
      insertParams = [employee_id, hasTemplate ? template_id : null, date, notes || null, assigned_by || null]
    }

    const result = await query(insertSql, insertParams)

    const assignment = result.rows[0]

    // Get the full assignment details for response
    const fullAssignmentResult = await query(`
      SELECT 
        sa.id,
        sa.employee_id,
        sa.template_id,
        sa.date,
        sa.override_name,
        sa.override_start_time,
        sa.override_end_time,
        sa.override_color,
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
      LEFT JOIN shift_templates st ON sa.template_id = st.id
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
      'SELECT id, employee_id, date FROM shift_assignments_new WHERE id = $1',
      [assignmentId]
    )

    if (existingAssignment.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Delete the assignment
    await query('DELETE FROM shift_assignments_new WHERE id = $1', [assignmentId])

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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, template_id, date, status, notes } = body
    const override_name = body.override_name
    const override_start_time = body.override_start_time
    const override_end_time = body.override_end_time
    const override_color = body.override_color

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    const fields: string[] = []
    const params: any[] = []
    let idx = 1
    if (typeof template_id !== 'undefined') { fields.push(`template_id = $${idx++}`); params.push(template_id) }
    if (date) { fields.push(`date = $${idx++}`); params.push(date) }
    if (status) { fields.push(`status = $${idx++}`); params.push(status) }
    if (typeof notes !== 'undefined') { fields.push(`notes = $${idx++}`); params.push(notes) }

    // Conditionally add override columns only if they exist
    const colCheckPut = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'shift_assignments_new'`
    )
    const cols = new Set(colCheckPut.rows.map((r: any) => r.column_name))
    if (cols.has('override_name') && typeof override_name !== 'undefined') { fields.push(`override_name = $${idx++}`); params.push(override_name) }
    if (cols.has('override_start_time') && typeof override_start_time !== 'undefined') { fields.push(`override_start_time = $${idx++}`); params.push(override_start_time) }
    if (cols.has('override_end_time') && typeof override_end_time !== 'undefined') { fields.push(`override_end_time = $${idx++}`); params.push(override_end_time) }
    if (cols.has('override_color') && typeof override_color !== 'undefined') { fields.push(`override_color = $${idx++}`); params.push(override_color) }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
    }

    const updateQuery = `
      UPDATE shift_assignments_new
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING *
    `
    params.push(id)
    const updateResult = await query(updateQuery, params)
    const updated = updateResult.rows[0]

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error updating shift assignment:', error)
    // Surface a clearer message if this is a NOT NULL violation due to missing migration
    const message = (error && error.message || '').includes('null value')
      ? 'Custom overrides require DB migration. Run scripts/cleanup_db.sql.'
      : 'Failed to update assignment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
