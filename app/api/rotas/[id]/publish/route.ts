import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/**
 * POST /api/rotas/[id]/publish
 * Publish a rota and make all its shifts visible to employees
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if rota exists and is in draft status
    const rotaResult = await query(
      `SELECT r.*, COUNT(sa.id) as total_shifts
       FROM rotas r
       LEFT JOIN shift_assignments sa ON r.id = sa.rota_id
       WHERE r.id = $1 AND r.tenant_id = $2
       GROUP BY r.id`,
      [id, tenantContext.tenant_id]
    )

    if (rotaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    const rota = rotaResult.rows[0]

    if (rota.status === 'published') {
      return NextResponse.json({ 
        error: 'Rota is already published' 
      }, { status: 400 })
    }

    if (rota.status !== 'draft') {
      return NextResponse.json({ 
        error: 'Only draft rotas can be published' 
      }, { status: 400 })
    }

    if (rota.total_shifts === 0) {
      return NextResponse.json({ 
        error: 'Cannot publish an empty rota. Please add shifts first.' 
      }, { status: 400 })
    }

    // Begin transaction
    await query('BEGIN')

    try {
      // Update rota status to published
      await query(
        `UPDATE rotas 
         SET status = 'published', published_by = $1, published_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [user.id, id, tenantContext.tenant_id]
      )

      // Mark all shift assignments in this rota as published
      await query(
        `UPDATE shift_assignments 
         SET is_published = TRUE, updated_at = NOW()
         WHERE rota_id = $1`,
        [id]
      )

      // Get all employees affected by this rota for notifications
      const affectedEmployees = await query(
        `SELECT DISTINCT sa.employee_id, e.first_name, e.last_name, e.email
         FROM shift_assignments sa
         JOIN employees e ON sa.employee_id = e.id AND e.tenant_id = sa.tenant_id
         WHERE sa.rota_id = $1`,
        [id]
      )

      // Create notifications for all affected employees
      if (affectedEmployees.rows.length > 0) {
        const notificationValues = affectedEmployees.rows.map((emp, index) => {
          const baseIndex = index * 5
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`
        }).join(', ')

        const notificationParams = affectedEmployees.rows.flatMap(emp => [
          tenantContext.tenant_id,
          id,
          emp.employee_id,
          'rota_published',
          `New rota "${rota.name}" has been published with your shift assignments.`
        ])

        await query(
          `INSERT INTO rota_notifications (tenant_id, rota_id, employee_id, notification_type, message)
           VALUES ${notificationValues}
           ON CONFLICT (tenant_id, rota_id, employee_id, notification_type) 
           DO UPDATE SET message = EXCLUDED.message, sent_at = NOW()`,
          notificationParams
        )
      }

      // Commit transaction
      await query('COMMIT')

      // Get updated rota with employee count
      const updatedRotaResult = await query(
        `SELECT r.*, 
                e1.first_name as created_by_first_name,
                e1.last_name as created_by_last_name,
                e2.first_name as published_by_first_name,
                e2.last_name as published_by_last_name,
                COUNT(DISTINCT sa.employee_id) as affected_employees,
                COUNT(sa.id) as total_shifts
         FROM rotas r
         LEFT JOIN employees e1 ON r.created_by = e1.id AND e1.tenant_id = r.tenant_id
         LEFT JOIN employees e2 ON r.published_by = e2.id AND e2.tenant_id = r.tenant_id
         LEFT JOIN shift_assignments sa ON r.id = sa.rota_id
         WHERE r.id = $1 AND r.tenant_id = $2
         GROUP BY r.id, e1.first_name, e1.last_name, e2.first_name, e2.last_name`,
        [id, tenantContext.tenant_id]
      )

      return NextResponse.json({
        success: true,
        data: updatedRotaResult.rows[0],
        message: `Rota "${rota.name}" published successfully. ${affectedEmployees.rows.length} employees have been notified.`
      })

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error in POST /api/rotas/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/rotas/[id]/publish
 * Unpublish a rota (move back to draft status)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if rota exists and is published
    const rotaResult = await query(
      `SELECT * FROM rotas WHERE id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (rotaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    const rota = rotaResult.rows[0]

    if (rota.status !== 'published') {
      return NextResponse.json({ 
        error: 'Only published rotas can be unpublished' 
      }, { status: 400 })
    }

    // Begin transaction
    await query('BEGIN')

    try {
      // Update rota status back to draft
      await query(
        `UPDATE rotas 
         SET status = 'draft', published_by = NULL, published_at = NULL, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantContext.tenant_id]
      )

      // Mark all shift assignments in this rota as unpublished
      await query(
        `UPDATE shift_assignments 
         SET is_published = FALSE, updated_at = NOW()
         WHERE rota_id = $1`,
        [id]
      )

      // Remove notifications for this rota
      await query(
        `DELETE FROM rota_notifications 
         WHERE rota_id = $1 AND tenant_id = $2`,
        [id, tenantContext.tenant_id]
      )

      // Commit transaction
      await query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Rota "${rota.name}" has been unpublished and moved back to draft status.`
      })

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error in DELETE /api/rotas/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
