import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { canRequestRotaPublish, canManageLocation } from '@/lib/location-permissions'

/**
 * POST /api/rotas/publish-request
 * Manager requests to publish a rota (requires admin approval)
 */
export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers and admins can request publish
    if (!canRequestRotaPublish(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only managers can request rota publishing' },
        { status: 403 }
      )
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { rota_id } = body

    if (!rota_id) {
      return NextResponse.json(
        { success: false, error: 'rota_id is required' },
        { status: 400 }
      )
    }

    // Get the rota and verify permissions
    const rotaResult = await query(`
      SELECT r.*, l.manager_id
      FROM rotas r
      LEFT JOIN locations l ON r.location_id = l.id
      WHERE r.id = $1 AND r.tenant_id = $2
    `, [rota_id, tenantContext.tenant_id])

    if (rotaResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rota not found' },
        { status: 404 }
      )
    }

    const rota = rotaResult.rows[0]

    // If manager, verify they manage this location
    if (user.role === 'manager') {
      if (!rota.location_id) {
        return NextResponse.json(
          { success: false, error: 'Rota must have a location assigned' },
          { status: 400 }
        )
      }

      const canManage = await canManageLocation(
        user.id,
        user.role,
        rota.location_id,
        tenantContext.tenant_id
      )

      if (!canManage) {
        return NextResponse.json(
          { success: false, error: 'You do not manage this location' },
          { status: 403 }
        )
      }
    }

    // Check if rota is already published
    if (rota.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Rota is already published' },
        { status: 400 }
      )
    }

    // Check if there's already a pending request
    const existingRequest = await query(`
      SELECT id FROM rota_publish_requests
      WHERE rota_id = $1 AND status = 'pending'
    `, [rota_id])

    if (existingRequest.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'There is already a pending publish request for this rota' },
        { status: 400 }
      )
    }

    // Create publish request
    const requestResult = await query(`
      INSERT INTO rota_publish_requests (
        tenant_id, rota_id, manager_id, status
      ) VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [tenantContext.tenant_id, rota_id, user.id])

    // Update rota status to pending_approval
    await query(`
      UPDATE rotas 
      SET status = 'pending_approval', updated_at = NOW()
      WHERE id = $1
    `, [rota_id])

    // Create notification for admins
    const admins = await query(`
      SELECT id FROM employees
      WHERE tenant_id = $1 AND role = 'admin' AND is_active = true
    `, [tenantContext.tenant_id])

    for (const admin of admins.rows) {
      await query(`
        INSERT INTO notifications (
          user_id, title, message, type, read, action_url, tenant_id
        ) VALUES ($1, $2, $3, $4, false, $5, $6)
      `, [
        admin.id,
        'Rota Publish Request',
        `${user.first_name} ${user.last_name} has requested to publish a rota for week ${rota.week_start_date}`,
        'info',
        `/admin/rotas/approve/${requestResult.rows[0].id}`,
        tenantContext.tenant_id
      ])
    }

    return NextResponse.json({
      success: true,
      data: requestResult.rows[0],
      message: 'Publish request submitted. Awaiting admin approval.'
    })

  } catch (error) {
    console.error('Error in POST /api/rotas/publish-request:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rotas/publish-request
 * Get all pending publish requests (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can view requests
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const result = await query(`
      SELECT 
        rpr.*,
        r.week_start_date,
        r.week_end_date,
        r.name as rota_name,
        l.name as location_name,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.email as manager_email,
        rev.first_name as reviewed_by_first_name,
        rev.last_name as reviewed_by_last_name
      FROM rota_publish_requests rpr
      JOIN rotas r ON rpr.rota_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      JOIN employees m ON rpr.manager_id = m.id
      LEFT JOIN employees rev ON rpr.reviewed_by = rev.id
      WHERE rpr.tenant_id = $1
        AND rpr.status = $2
      ORDER BY rpr.created_at DESC
    `, [tenantContext.tenant_id, status])

    return NextResponse.json({
      success: true,
      data: result.rows
    })

  } catch (error) {
    console.error('Error in GET /api/rotas/publish-request:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

