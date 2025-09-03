import { NextRequest, NextResponse } from 'next/server'
import { query, getShifts, createShift, updateShift, deleteShift } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

// Validation schemas
const createShiftSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  department: z.string().optional(),
  required_staff: z.number().positive('Required staff must be positive'),
  hourly_rate: z.number().positive().optional(),
  color: z.string().min(1, 'Color is required'),
  is_active: z.boolean().default(true),
  created_by: z.string().uuid().optional(),
})

const updateShiftSchema = createShiftSchema.partial()

/**
 * GET /api/shifts
 * List all shifts with optional filters
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
    const department = searchParams.get('department')
    const is_active = searchParams.get('is_active')

    // Build filters
    const filters: any = { tenant_id: tenantContext.tenant_id }
    if (department) filters.department = department
    if (is_active !== null) filters.is_active = is_active === 'true'

    // Get shifts
    const shifts = await getShifts(filters)

    return NextResponse.json({
      data: shifts,
    })
  } catch (error) {
    console.error('Error in GET /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/shifts
 * Create a new shift
 */
export async function POST(request: NextRequest) {
  try {
    // Use demo authentication
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
    const validatedData = createShiftSchema.parse(body)

    // Insert directly to ensure tenant fields
    const insert = await query(
      `INSERT INTO shift_templates (
        name, description, start_time, end_time, department, 
        required_staff, hourly_rate, color, is_active, created_by, tenant_id, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        validatedData.name,
        validatedData.description || null,
        validatedData.start_time,
        validatedData.end_time,
        validatedData.department || null,
        validatedData.required_staff,
        validatedData.hourly_rate || null,
        validatedData.color,
        validatedData.is_active,
        validatedData.created_by || user.id,
        tenantContext.tenant_id,
        tenantContext.organization_id,
      ]
    )

    return NextResponse.json({ data: insert.rows[0], message: 'Shift created successfully' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }

    console.error('Error in POST /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/shifts
 * Update a shift
 */
export async function PUT(request: NextRequest) {
  try {
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 })
    }

    // Ensure the shift belongs to tenant
    const existing = await query('SELECT id FROM shift_templates WHERE id = $1 AND tenant_id = $2', [id, tenantContext.tenant_id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Validate update data
    const validatedData = updateShiftSchema.parse(updateData)

    // Update shift
    const fields = Object.keys(validatedData)
    const values = Object.values(validatedData)
    const setClauses = fields.map((field, idx) => `${field} = $${idx + 3}`).join(', ')
    const updated = await query(
      `UPDATE shift_templates SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      [id, tenantContext.tenant_id, ...values]
    )

    return NextResponse.json({ data: updated.rows[0], message: 'Shift updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    console.error('Error in PUT /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/shifts
 * Delete a shift
 */
export async function DELETE(request: NextRequest) {
  try {
    // Use demo authentication
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
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 })
    }

    // Ensure no assignments within tenant
    const assignmentResult = await query(
      `SELECT COUNT(*) as assignment_count FROM shift_assignments_new WHERE template_id = $1 AND tenant_id = $2`,
      [id, tenantContext.tenant_id]
    )
    if (parseInt(assignmentResult.rows[0].assignment_count) > 0) {
      return NextResponse.json({ error: 'Cannot delete shift that has assignments. Please remove assignments first.' }, { status: 400 })
    }

    // Delete shift in tenant
    const deleted = await query('DELETE FROM shift_templates WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantContext.tenant_id])
    if (deleted.rows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Shift deleted successfully' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Shift not found') {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    console.error('Error in DELETE /api/shifts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 