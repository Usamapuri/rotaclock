import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

// Validation schemas
const createRotaSchema = z.object({
  name: z.string().min(1, 'Rota name is required').max(255, 'Rota name too long'),
  description: z.string().optional(),
  week_start_date: z.string().min(1, 'Week start date is required'),
})

const updateRotaSchema = createRotaSchema.partial()

/**
 * GET /api/rotas
 * Get all rotas with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const week_start_date = searchParams.get('week_start_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let queryText = `
      SELECT 
        r.*,
        e1.first_name as created_by_first_name,
        e1.last_name as created_by_last_name,
        e2.first_name as published_by_first_name,
        e2.last_name as published_by_last_name,
        COUNT(sa.id) as total_shifts
      FROM rotas r
      LEFT JOIN employees e1 ON r.created_by = e1.id AND e1.tenant_id = r.tenant_id
      LEFT JOIN employees e2 ON r.published_by = e2.id AND e2.tenant_id = r.tenant_id
      LEFT JOIN shift_assignments sa ON r.id = sa.rota_id
      WHERE r.tenant_id = $1
    `
    const params: any[] = [tenantContext.tenant_id]
    let paramIndex = 2

    if (status) {
      queryText += ` AND r.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (week_start_date) {
      queryText += ` AND r.week_start_date = $${paramIndex}`
      params.push(week_start_date)
      paramIndex++
    }

    queryText += `
      GROUP BY r.id, e1.first_name, e1.last_name, e2.first_name, e2.last_name
      ORDER BY r.week_start_date DESC, r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(limit, offset)

    const result = await query(queryText, params)

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rows.length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/rotas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/rotas
 * Create a new rota
 */
export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createRotaSchema.parse(body)

    // Check for duplicate rota name for the same week
    const existingRota = await query(
      `SELECT id FROM rotas 
       WHERE tenant_id = $1 AND name = $2 AND week_start_date = $3 AND status != 'archived'`,
      [tenantContext.tenant_id, validatedData.name, validatedData.week_start_date]
    )

    if (existingRota.rows.length > 0) {
      return NextResponse.json({ 
        error: 'A rota with this name already exists for the selected week' 
      }, { status: 400 })
    }

    // Create the rota
    const result = await query(
      `INSERT INTO rotas (
        tenant_id, organization_id, name, description, week_start_date, 
        status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenantContext.tenant_id,
        tenantContext.organization_id,
        validatedData.name,
        validatedData.description || null,
        validatedData.week_start_date,
        'draft',
        user.id
      ]
    )

    return NextResponse.json({ 
      success: true,
      data: result.rows[0], 
      message: 'Rota created successfully' 
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in POST /api/rotas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/rotas
 * Update a rota (only draft rotas can be updated)
 */
export async function PUT(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Rota ID is required' }, { status: 400 })
    }

    const validatedData = updateRotaSchema.parse(updateData)

    // Check if rota exists and is in draft status
    const existingRota = await query(
      `SELECT id, status FROM rotas WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (existingRota.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    if (existingRota.rows[0].status !== 'draft') {
      return NextResponse.json({ 
        error: 'Only draft rotas can be updated' 
      }, { status: 400 })
    }

    // Build update query dynamically
    const updateFields = Object.keys(validatedData).filter(key => validatedData[key as keyof typeof validatedData] !== undefined)
    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 3}`).join(', ')
    const values = updateFields.map(field => validatedData[field as keyof typeof validatedData])

    const result = await query(
      `UPDATE rotas SET ${setClause}, updated_at = NOW() 
       WHERE id = $1 AND tenant_id = $2 
       RETURNING *`,
      [id, tenantContext.tenant_id, ...values]
    )

    return NextResponse.json({ 
      success: true,
      data: result.rows[0], 
      message: 'Rota updated successfully' 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error in PUT /api/rotas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/rotas
 * Delete a rota (only draft rotas can be deleted)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rota ID is required' }, { status: 400 })
    }

    // Check if rota exists and is in draft status
    const existingRota = await query(
      `SELECT id, status FROM rotas WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (existingRota.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    if (existingRota.rows[0].status !== 'draft') {
      return NextResponse.json({ 
        error: 'Only draft rotas can be deleted' 
      }, { status: 400 })
    }

    // Delete associated shift assignments first
    await query(
      `DELETE FROM shift_assignments WHERE rota_id = $1`,
      [id]
    )

    // Delete the rota
    await query(
      `DELETE FROM rotas WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Rota deleted successfully' 
    })
  } catch (error) {
    console.error('Error in DELETE /api/rotas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
