import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department') || ''
    const isActive = searchParams.get('is_active')

    let queryText = `
      SELECT 
        id,
        name,
        description,
        start_time,
        end_time,
        department,
        required_staff,
        hourly_rate,
        color,
        is_active,
        created_at,
        updated_at
      FROM shifts
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (department) {
      queryText += ` AND department = $${paramIndex}`
      params.push(department)
      paramIndex++
    }

    if (isActive !== null && isActive !== undefined) {
      queryText += ` AND is_active = $${paramIndex}`
      params.push(isActive === 'true')
      paramIndex++
    }

    queryText += ` ORDER BY name`

    const result = await query(queryText, params)

    return NextResponse.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Error fetching shift templates:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shift templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      description, 
      start_time, 
      end_time, 
      department, 
      required_staff, 
      hourly_rate, 
      color,
      created_by 
    } = body

    // Validate required fields
    if (!name || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, start_time, end_time' },
        { status: 400 }
      )
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      )
    }

    // Check if shift with same name already exists
    const existingShift = await query(
      'SELECT id FROM shifts WHERE name = $1 AND is_active = true',
      [name]
    )

    if (existingShift.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Shift template with this name already exists' },
        { status: 409 }
      )
    }

    // Create the shift template
    const result = await query(`
      INSERT INTO shifts (
        name,
        description,
        start_time,
        end_time,
        department,
        required_staff,
        hourly_rate,
        color,
        is_active,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW(), NOW())
      RETURNING id, name, start_time, end_time, department, color, created_at
    `, [
      name,
      description || null,
      start_time,
      end_time,
      department || 'General',
      required_staff || 1,
      hourly_rate || null,
      color || '#3B82F6',
      created_by || null
    ])

    const template = result.rows[0]

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Shift template created successfully'
    })

  } catch (error) {
    console.error('Error creating shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create shift template' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id,
      name, 
      description, 
      start_time, 
      end_time, 
      department, 
      required_staff, 
      hourly_rate, 
      color,
      is_active 
    } = body

    // Validate required fields
    if (!id || !name || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, name, start_time, end_time' },
        { status: 400 }
      )
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      )
    }

    // Check if shift exists
    const existingShift = await query(
      'SELECT id FROM shifts WHERE id = $1',
      [id]
    )

    if (existingShift.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift template not found' },
        { status: 404 }
      )
    }

    // Check if name is already taken by another shift
    const nameConflict = await query(
      'SELECT id FROM shifts WHERE name = $1 AND id != $2 AND is_active = true',
      [name, id]
    )

    if (nameConflict.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Shift template with this name already exists' },
        { status: 409 }
      )
    }

    // Update the shift template
    const result = await query(`
      UPDATE shifts SET
        name = $1,
        description = $2,
        start_time = $3,
        end_time = $4,
        department = $5,
        required_staff = $6,
        hourly_rate = $7,
        color = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING id, name, start_time, end_time, department, color, is_active, updated_at
    `, [
      name,
      description || null,
      start_time,
      end_time,
      department || 'General',
      required_staff || 1,
      hourly_rate || null,
      color || '#3B82F6',
      is_active !== undefined ? is_active : true,
      id
    ])

    const template = result.rows[0]

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Shift template updated successfully'
    })

  } catch (error) {
    console.error('Error updating shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update shift template' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Check if template exists
    const existingTemplate = await query(
      'SELECT id, name FROM shifts WHERE id = $1',
      [templateId]
    )

    if (existingTemplate.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift template not found' },
        { status: 404 }
      )
    }

    // Check if template is being used in assignments
    const activeAssignments = await query(
      'SELECT COUNT(*) as count FROM shift_assignments WHERE shift_id = $1',
      [templateId]
    )

    if (parseInt(activeAssignments.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete template that has active assignments' },
        { status: 409 }
      )
    }

    // Soft delete by setting is_active to false
    await query(
      'UPDATE shifts SET is_active = false, updated_at = NOW() WHERE id = $1',
      [templateId]
    )

    return NextResponse.json({
      success: true,
      message: 'Shift template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting shift template:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete shift template' },
      { status: 500 }
    )
  }
}
