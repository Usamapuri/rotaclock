import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/**
 * POST /api/admin/rotas/approve
 * Admin approves or denies a rota publish request
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

    // Only admins can approve
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

    const body = await request.json()
    const { request_id, action, admin_note } = body

    if (!request_id || !action) {
      return NextResponse.json(
        { success: false, error: 'request_id and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'deny'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action must be "approve" or "deny"' },
        { status: 400 }
      )
    }

    // Get the publish request
    const requestResult = await query(`
      SELECT rpr.*, r.status as rota_status, r.name as rota_name
      FROM rota_publish_requests rpr
      JOIN rotas r ON rpr.rota_id = r.id
      WHERE rpr.id = $1 AND rpr.tenant_id = $2
    `, [request_id, tenantContext.tenant_id])

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Publish request not found' },
        { status: 404 }
      )
    }

    const publishRequest = requestResult.rows[0]

    // Check if already processed
    if (publishRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'denied'
    const newRotaStatus = action === 'approve' ? 'published' : 'draft'

    // Update the publish request
    await query(`
      UPDATE rota_publish_requests
      SET status = $1,
          admin_note = $2,
          reviewed_by = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
    `, [newStatus, admin_note || null, user.id, request_id])

    // Update the rota status
    await query(`
      UPDATE rotas
      SET status = $1,
          is_published = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newRotaStatus, action === 'approve', publishRequest.rota_id])

    // If approved, publish all shift assignments for this rota
    if (action === 'approve') {
      await query(`
        UPDATE shift_assignments
        SET is_published = true, updated_at = NOW()
        WHERE rota_id = $1
      `, [publishRequest.rota_id])
    }

    // Notify the manager
    await query(`
      INSERT INTO notifications (
        user_id, title, message, type, read, action_url, tenant_id
      ) VALUES ($1, $2, $3, $4, false, $5, $6)
    `, [
      publishRequest.manager_id,
      action === 'approve' ? 'Rota Published' : 'Rota Publish Denied',
      action === 'approve'
        ? `Your rota "${publishRequest.rota_name}" has been approved and published.${admin_note ? ' Note: ' + admin_note : ''}`
        : `Your rota publish request was denied.${admin_note ? ' Reason: ' + admin_note : ''}`,
      action === 'approve' ? 'success' : 'warning',
      `/manager/rotas/${publishRequest.rota_id}`,
      tenantContext.tenant_id
    ])

    return NextResponse.json({
      success: true,
      message: action === 'approve' 
        ? 'Rota has been published successfully'
        : 'Rota publish request has been denied',
      data: {
        request_id,
        rota_id: publishRequest.rota_id,
        new_status: newStatus,
        new_rota_status: newRotaStatus
      }
    })

  } catch (error) {
    console.error('Error in POST /api/admin/rotas/approve:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/rotas/approve?request_id={id}
 * Get details of a specific publish request
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
    const request_id = searchParams.get('request_id')

    if (!request_id) {
      return NextResponse.json(
        { success: false, error: 'request_id is required' },
        { status: 400 }
      )
    }

    const result = await query(`
      SELECT 
        rpr.*,
        r.week_start_date,
        r.week_end_date,
        r.name as rota_name,
        r.status as rota_status,
        l.name as location_name,
        l.id as location_id,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.email as manager_email,
        rev.first_name as reviewed_by_first_name,
        rev.last_name as reviewed_by_last_name,
        (SELECT COUNT(*) FROM shift_assignments WHERE rota_id = r.id) as total_shifts
      FROM rota_publish_requests rpr
      JOIN rotas r ON rpr.rota_id = r.id
      LEFT JOIN locations l ON r.location_id = l.id
      JOIN employees m ON rpr.manager_id = m.id
      LEFT JOIN employees rev ON rpr.reviewed_by = rev.id
      WHERE rpr.id = $1 AND rpr.tenant_id = $2
    `, [request_id, tenantContext.tenant_id])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Publish request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Error in GET /api/admin/rotas/approve:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

