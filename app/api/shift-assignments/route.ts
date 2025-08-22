import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createShiftAssignmentSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  template_id: z.string().uuid('Invalid template ID'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['assigned', 'confirmed', 'completed', 'cancelled']).default('assigned'),
  notes: z.string().optional()
})

const updateShiftAssignmentSchema = createShiftAssignmentSchema.partial()

/**
 * GET /api/shift-assignments
 * List shift assignments with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const employee_id = searchParams.get('employee_id')
    const template_id = searchParams.get('template_id')
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let queryText = `
      SELECT 
        sa.id,
        sa.employee_id,
        sa.template_id,
        sa.date,
        sa.start_time,
        sa.end_time,
        sa.status,
        sa.assigned_by,
        sa.notes,
        sa.created_at,
        sa.updated_at,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.department as employee_department,
        st.name as template_name,
        st.start_time as template_start_time,
        st.end_time as template_end_time,
        st.color as template_color,
        st.department as template_department,
        aba.first_name || ' ' || aba.last_name as assigned_by_name
      FROM shift_assignments_new sa
      JOIN employees_new e ON sa.employee_id = e.id
      JOIN shift_templates st ON sa.template_id = st.id
      LEFT JOIN employees_new aba ON sa.assigned_by = aba.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (start_date && end_date) {
      queryText += ` AND sa.date BETWEEN $${paramIndex++} AND $${paramIndex++}`
      params.push(start_date, end_date)
    }
    if (employee_id) {
      queryText += ` AND sa.employee_id = $${paramIndex++}`
      params.push(employee_id)
    }
    if (template_id) {
      queryText += ` AND sa.template_id = $${paramIndex++}`
      params.push(template_id)
    }
    if (status) {
      queryText += ` AND sa.status = $${paramIndex++}`
      params.push(status)
    }
    if (department) {
      queryText += ` AND (e.department = $${paramIndex} OR st.department = $${paramIndex})`
      params.push(department)
      paramIndex++
    }

    // Add ordering
    queryText += ` ORDER BY sa.date DESC, e.first_name, e.last_name`

    // Get total count
    const countQuery = queryText.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM')
    const countResult = await query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Apply pagination
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    const assignments = result.rows

    return NextResponse.json({
      success: true,
      data: assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shift-assignments:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shift-assignments
 * Create a new shift assignment
 */
export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createShiftAssignmentSchema.parse(body)

    // Check if employee exists
    const employeeResult = await query(
      'SELECT id FROM employees_new WHERE id = $1 AND is_active = true',
      [validatedData.employee_id]
    )

    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found or inactive' }, { status: 404 })
    }

    // Check if template exists
    const templateResult = await query(
      'SELECT id FROM shift_templates WHERE id = $1 AND is_active = true',
      [validatedData.template_id]
    )

    if (templateResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shift template not found or inactive' }, { status: 404 })
    }

    // Check for conflicting assignments
    const conflictResult = await query(
      `SELECT id, status FROM shift_assignments_new 
       WHERE employee_id = $1 
       AND date = $2 
       AND status NOT IN ('cancelled')`,
      [validatedData.employee_id, validatedData.date]
    )

    if (conflictResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Employee already has an assignment on this date'
      }, { status: 409 })
    }

    // Create shift assignment
    const insertQuery = `
      INSERT INTO shift_assignments_new (
        employee_id, template_id, date, start_time, end_time, status, assigned_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `

    const insertResult = await query(insertQuery, [
      validatedData.employee_id,
      validatedData.template_id,
      validatedData.date,
      validatedData.start_time,
      validatedData.end_time,
      validatedData.status,
      user.id,
      validatedData.notes || ''
    ])

    const newAssignment = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      data: newAssignment,
      message: 'Shift assignment created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error in POST /api/shift-assignments:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
