import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'
import { getUserLocationAccess, canManageLocation, canPublishRota } from '@/lib/location-permissions'

// Validation schemas
const createRotaSchema = z.object({
  name: z.string().min(1, 'Rota name is required').max(255, 'Rota name too long'),
  description: z.string().optional(),
  week_start_date: z.string().min(1, 'Week start date is required'),
  location_id: z.string().uuid('Invalid location ID').optional(),
})

const updateRotaSchema = createRotaSchema.partial()

/**
 * GET /api/rotas
 * Get all rotas with optional filters
 * - Admins: See all rotas in tenant
 * - Managers: See only rotas for their location
 * - Agents: See only PUBLISHED rotas
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

    // Get location access for this user
    const locationAccess = await getUserLocationAccess(
      user.id,
      user.role,
      tenantContext.tenant_id
    )

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
        l.name as location_name,
        e1.first_name as created_by_first_name,
        e1.last_name as created_by_last_name,
        e2.first_name as published_by_first_name,
        e2.last_name as published_by_last_name,
        COUNT(sa.id) as total_shifts,
        rpr.status as publish_request_status,
        rpr.id as publish_request_id
      FROM rotas r
      LEFT JOIN locations l ON r.location_id = l.id
      LEFT JOIN employees e1 ON r.created_by = e1.id AND e1.tenant_id = r.tenant_id
      LEFT JOIN employees e2 ON r.published_by = e2.id AND e2.tenant_id = r.tenant_id
      LEFT JOIN shift_assignments sa ON r.id = sa.rota_id
      LEFT JOIN rota_publish_requests rpr ON r.id = rpr.rota_id AND rpr.status = 'pending'
      WHERE r.tenant_id = $1
    `
    const params: any[] = [tenantContext.tenant_id]
    let paramIndex = 2

    // AGENTS can only see PUBLISHED rotas
    if (locationAccess.isAgent) {
      queryText += ` AND r.status = 'published'`
    }

    // MANAGERS can only see rotas for their location
    if (locationAccess.isManager && locationAccess.locationId) {
      queryText += ` AND r.location_id = $${paramIndex}`
      params.push(locationAccess.locationId)
      paramIndex++
    }

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
      GROUP BY r.id, l.name, e1.first_name, e1.last_name, e2.first_name, e2.last_name, rpr.status, rpr.id
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
 * - Admins: Can create rotas for any location
 * - Managers: Can only create rotas for their location
 */
export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and managers can create rotas
    if (user.role === 'agent') {
      return NextResponse.json({ 
        error: 'Agents cannot create rotas' 
      }, { status: 403 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    // Get location access
    const locationAccess = await getUserLocationAccess(
      user.id,
      user.role,
      tenantContext.tenant_id
    )

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createRotaSchema.parse(body)

    // Determine location_id
    let locationId = validatedData.location_id

    // If manager, enforce their location
    if (locationAccess.isManager) {
      if (!locationAccess.locationId) {
        return NextResponse.json({ 
          error: 'You are not assigned to a location' 
        }, { status: 403 })
      }
      
      // Manager can only create rotas for their location
      if (locationId && locationId !== locationAccess.locationId) {
        return NextResponse.json({ 
          error: 'You can only create rotas for your assigned location' 
        }, { status: 403 })
      }
      
      locationId = locationAccess.locationId
    }

    // Admin must specify a location (or we can make it optional)
    if (locationAccess.isAdmin && !locationId) {
      // Get the first active location for this tenant as default
      const defaultLocation = await query(`
        SELECT id FROM locations 
        WHERE tenant_id = $1 AND is_active = true 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [tenantContext.tenant_id])
      
      if (defaultLocation.rows.length > 0) {
        locationId = defaultLocation.rows[0].id
      }
    }

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

    // Create the rota (always starts as 'draft')
    const result = await query(
      `INSERT INTO rotas (
        tenant_id, organization_id, name, description, week_start_date, 
        location_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
      RETURNING *`,
      [
        tenantContext.tenant_id,
        tenantContext.organization_id,
        validatedData.name,
        validatedData.description || null,
        validatedData.week_start_date,
        locationId || null,
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
 * Update a rota
 * - Admins: Can update any rota
 * - Managers: Can update rotas for their location (but cannot directly set status='published')
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

    // Get location access
    const locationAccess = await getUserLocationAccess(
      user.id,
      user.role,
      tenantContext.tenant_id
    )

    // Parse and validate request body
    const body = await request.json()
    const { id, status: newStatus, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Rota ID is required' }, { status: 400 })
    }

    const validatedData = updateRotaSchema.parse(updateData)

    // Check if rota exists
    const existingRota = await query(
      `SELECT r.*, l.manager_id 
       FROM rotas r
       LEFT JOIN locations l ON r.location_id = l.id
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (existingRota.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    const rota = existingRota.rows[0]

    // Check location permissions for managers
    if (locationAccess.isManager) {
      if (!rota.location_id) {
        return NextResponse.json({ 
          error: 'Cannot update rota without location' 
        }, { status: 403 })
      }

      const canManage = await canManageLocation(
        user.id,
        user.role,
        rota.location_id,
        tenantContext.tenant_id
      )

      if (!canManage) {
        return NextResponse.json({ 
          error: 'You can only update rotas for your location' 
        }, { status: 403 })
      }
    }

    // CRITICAL: Prevent managers from directly publishing
    if (newStatus === 'published' && !canPublishRota(user.role)) {
      return NextResponse.json({ 
        error: 'Managers cannot directly publish rotas. Please submit a publish request instead.',
        hint: 'Use POST /api/rotas/publish-request to request approval'
      }, { status: 403 })
    }

    // Only allow updates to draft rotas (unless admin is publishing)
    if (rota.status !== 'draft' && !locationAccess.isAdmin) {
      return NextResponse.json({ 
        error: 'Only draft rotas can be updated' 
      }, { status: 400 })
    }

    // Build update query dynamically
    const updateFields = Object.keys(validatedData).filter(key => validatedData[key as keyof typeof validatedData] !== undefined)
    if (updateFields.length === 0 && !newStatus) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    let setClause = updateFields.map((field, index) => `${field} = $${index + 3}`).join(', ')
    const values = updateFields.map(field => validatedData[field as keyof typeof validatedData])

    // Add status if provided (admin only for 'published')
    if (newStatus && canPublishRota(user.role)) {
      if (setClause) setClause += ', '
      setClause += `status = $${values.length + 3}, is_published = $${values.length + 4}`
      values.push(newStatus, newStatus === 'published')
    }

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
 * - Admins: Can delete any draft rota
 * - Managers: Can delete draft rotas for their location
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

    // Get location access
    const locationAccess = await getUserLocationAccess(
      user.id,
      user.role,
      tenantContext.tenant_id
    )

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rota ID is required' }, { status: 400 })
    }

    // Check if rota exists
    const existingRota = await query(
      `SELECT r.*, l.manager_id 
       FROM rotas r
       LEFT JOIN locations l ON r.location_id = l.id
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (existingRota.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    const rota = existingRota.rows[0]

    // Check location permissions for managers
    if (locationAccess.isManager) {
      if (!rota.location_id) {
        return NextResponse.json({ 
          error: 'Cannot delete rota without location' 
        }, { status: 403 })
      }

      const canManage = await canManageLocation(
        user.id,
        user.role,
        rota.location_id,
        tenantContext.tenant_id
      )

      if (!canManage) {
        return NextResponse.json({ 
          error: 'You can only delete rotas for your location' 
        }, { status: 403 })
      }
    }

    if (rota.status !== 'draft') {
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

