import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

const updateRotaSchema = z.object({
  name: z.string().min(1, 'Rota name is required').max(255, 'Rota name too long').optional(),
  description: z.string().optional(),
  week_start_date: z.string().min(1, 'Week start date is required').optional(),
})

/**
 * GET /api/rotas/[id]
 * Get a specific rota with its shift assignments
 */
export async function GET(
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

    // Get rota details
    const rotaResult = await query(
      `SELECT r.*,
              e1.first_name as created_by_first_name,
              e1.last_name as created_by_last_name,
              e2.first_name as published_by_first_name,
              e2.last_name as published_by_last_name
       FROM rotas r
       LEFT JOIN employees e1 ON r.created_by = e1.id AND e1.tenant_id = r.tenant_id
       LEFT JOIN employees e2 ON r.published_by = e2.id AND e2.tenant_id = r.tenant_id
       WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )

    if (rotaResult.rows.length === 0) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    const rota = rotaResult.rows[0]

    // Get shift assignments for this rota
    const shiftsResult = await query(
      `SELECT sa.*,
              e.first_name as employee_first_name,
              e.last_name as employee_last_name,
              e.employee_code,
              e.department as employee_department,
              st.name as template_name,
              st.start_time as template_start_time,
              st.end_time as template_end_time,
              st.color as template_color,
              st.department as template_department
       FROM shift_assignments sa
       LEFT JOIN employees e ON sa.employee_id = e.id AND e.tenant_id = sa.tenant_id
       LEFT JOIN shift_templates st ON sa.template_id = st.id AND st.tenant_id = sa.tenant_id
       WHERE sa.rota_id = $1
       ORDER BY sa.date, e.first_name, e.last_name`,
      [id]
    )

    // Group shifts by date and employee for easier frontend consumption
    const shiftsByDate: { [date: string]: any[] } = {}
    const employeesInRota = new Set()

    shiftsResult.rows.forEach(shift => {
      if (!shiftsByDate[shift.date]) {
        shiftsByDate[shift.date] = []
      }
      shiftsByDate[shift.date].push({
        id: shift.id,
        employee_id: shift.employee_id,
        employee_name: `${shift.employee_first_name} ${shift.employee_last_name}`,
        employee_code: shift.employee_code,
        employee_department: shift.employee_department,
        template_id: shift.template_id,
        template_name: shift.template_name,
        start_time: shift.override_start_time || shift.template_start_time,
        end_time: shift.override_end_time || shift.template_end_time,
        shift_name: shift.override_name || shift.template_name,
        color: shift.override_color || shift.template_color,
        status: shift.status,
        notes: shift.notes,
        is_published: shift.is_published
      })
      employeesInRota.add(shift.employee_id)
    })

    return NextResponse.json({
      success: true,
      data: {
        ...rota,
        shift_assignments: shiftsByDate,
        total_shifts: shiftsResult.rows.length,
        total_employees: employeesInRota.size
      }
    })
  } catch (error) {
    console.error('Error in GET /api/rotas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/rotas/[id]
 * Update a specific rota
 */
export async function PUT(
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateRotaSchema.parse(body)

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

    console.error('Error in PUT /api/rotas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/rotas/[id]
 * Delete a specific rota
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

    // Check if rota exists and is in draft status
    const existingRota = await query(
      `SELECT id, status, name FROM rotas WHERE id = $1 AND tenant_id = $2`,
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

    // Begin transaction
    await query('BEGIN')

    try {
      // Delete associated shift assignments first
      await query(
        `DELETE FROM shift_assignments WHERE rota_id = $1`,
        [id]
      )

      // Delete associated notifications
      await query(
        `DELETE FROM rota_notifications WHERE rota_id = $1 AND tenant_id = $2`,
        [id, tenantContext.tenant_id]
      )

      // Delete the rota
      await query(
        `DELETE FROM rotas WHERE id = $1 AND tenant_id = $2`,
        [id, tenantContext.tenant_id]
      )

      // Commit transaction
      await query('COMMIT')

      return NextResponse.json({ 
        success: true,
        message: `Rota "${existingRota.rows[0].name}" deleted successfully` 
      })

    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error in DELETE /api/rotas/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
