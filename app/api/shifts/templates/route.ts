import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

// Validation schema for shift templates
const createShiftTemplateSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  description: z.string().optional(),
  start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  department: z.string().optional(),
  required_staff: z.number().positive('Required staff must be positive'),
  hourly_rate: z.number().positive('Hourly rate must be positive').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  is_active: z.boolean().default(true)
})

/**
 * GET /api/shifts/templates
 * Fetch shift templates with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Build query
    let queryText = 'SELECT * FROM shifts WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (department) {
      queryText += ` AND department = $${paramIndex++}`
      params.push(department)
    }
    if (is_active !== null) {
      queryText += ` AND is_active = $${paramIndex++}`
      params.push(is_active === 'true')
    }

    // Get total count
    const countQuery = queryText.replace('SELECT *', 'SELECT COUNT(*) as total')
    const countResult = await query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Apply pagination and ordering
    queryText += ' ORDER BY name ASC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1)
    params.push(limit, offset)

    const result = await query(queryText, params)
    const shifts = result.rows

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      shifts: shifts || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })

  } catch (error) {
    console.error('Error in GET /api/shifts/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts/templates
 * Create a new shift template
 */
export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = createShiftTemplateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }

    const shiftData = validationResult.data

    // Validate time logic
    const startTime = shiftData.start_time
    const endTime = shiftData.end_time
    
    if (startTime >= endTime) {
      return NextResponse.json({ 
        error: 'End time must be after start time' 
      }, { status: 400 })
    }

    // Create shift template
    const result = await query(`
      INSERT INTO shifts (
        name, description, start_time, end_time, department, 
        required_staff, hourly_rate, color, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      shiftData.name,
      shiftData.description,
      shiftData.start_time,
      shiftData.end_time,
      shiftData.department,
      shiftData.required_staff,
      shiftData.hourly_rate,
      shiftData.color || '#3B82F6',
      shiftData.is_active,
      user?.id || null
    ])

    const shift = result.rows[0]

    return NextResponse.json({ 
      shift,
      message: 'Shift template created successfully' 
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/shifts/templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 