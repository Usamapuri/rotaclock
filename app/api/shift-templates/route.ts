import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schemas
const createShiftTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  department: z.string().optional(),
  required_staff: z.number().positive('Required staff must be positive'),
  hourly_rate: z.number().positive('Hourly rate must be positive').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  is_active: z.boolean().default(true)
})

const updateShiftTemplateSchema = createShiftTemplateSchema.partial()

/**
 * GET /api/shift-templates
 * List all shift templates with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let queryText = `
      SELECT 
        st.id,
        st.name,
        st.description,
        st.start_time,
        st.end_time,
        st.department,
        st.required_staff,
        st.hourly_rate,
        st.color,
        st.is_active,
        st.created_by,
        st.created_at,
        st.updated_at,
        e.first_name || ' ' || e.last_name as created_by_name,
        COUNT(sa.id) as total_assignments
      FROM shift_templates st
      LEFT JOIN employees_new e ON st.created_by = e.id
      LEFT JOIN shift_assignments_new sa ON st.id = sa.template_id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (department) {
      queryText += ` AND st.department = $${paramIndex++}`
      params.push(department)
    }
    if (is_active !== null) {
      queryText += ` AND st.is_active = $${paramIndex++}`
      params.push(is_active === 'true')
    }
    if (search) {
      queryText += ` AND (
        LOWER(st.name) LIKE LOWER($${paramIndex}) OR
        LOWER(st.description) LIKE LOWER($${paramIndex}) OR
        LOWER(st.department) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Add grouping and ordering
    queryText += ` GROUP BY st.id, st.name, st.description, st.start_time, st.end_time, st.department, st.required_staff, st.hourly_rate, st.color, st.is_active, st.created_by, st.created_at, st.updated_at, e.first_name, e.last_name`
    queryText += ` ORDER BY st.name`

    // Get total count
    const countQuery = queryText.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT st.id) as total FROM')
    const countResult = await query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Apply pagination
    queryText += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await query(queryText, params)
    const templates = result.rows

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shift-templates:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shift-templates
 * Create a new shift template
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
    const validatedData = createShiftTemplateSchema.parse(body)

    // Check if template with same name already exists
    const existingTemplate = await query(
      'SELECT id FROM shift_templates WHERE name = $1 AND is_active = true',
      [validatedData.name]
    )

    if (existingTemplate.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Shift template with this name already exists'
      }, { status: 409 })
    }

    // Create shift template
    const insertQuery = `
      INSERT INTO shift_templates (
        name, description, start_time, end_time, department,
        required_staff, hourly_rate, color, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `

    const insertResult = await query(insertQuery, [
      validatedData.name,
      validatedData.description || '',
      validatedData.start_time,
      validatedData.end_time,
      validatedData.department || 'General',
      validatedData.required_staff,
      validatedData.hourly_rate,
      validatedData.color || '#3B82F6',
      validatedData.is_active,
      user.id
    ])

    const newTemplate = insertResult.rows[0]

    return NextResponse.json({
      success: true,
      data: newTemplate,
      message: 'Shift template created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error in POST /api/shift-templates:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
