import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department') || ''
    const isActive = searchParams.get('is_active')

    let queryText = `
      SELECT id, name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active, created_at, updated_at
      FROM shift_templates
      WHERE tenant_id = $1
    `
    const params: any[] = [tenantContext.tenant_id]
    let paramIndex = 2

    if (department) {
      queryText += ` AND department = $${paramIndex++}`
      params.push(department)
    }
    if (isActive !== null && isActive !== undefined) {
      queryText += ` AND is_active = $${paramIndex++}`
      params.push(isActive === 'true')
    }

    queryText += ` ORDER BY name`
    const result = await query(queryText, params)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Error fetching shift templates:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shift templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, start_time, end_time, department, required_staff, hourly_rate, color, created_by } = body

    if (!name || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: 'Missing required fields: name, start_time, end_time' }, { status: 400 })
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({ success: false, error: 'Invalid time format. Use HH:MM' }, { status: 400 })
    }

    const existingShift = await query(
      'SELECT id FROM shift_templates WHERE name = $1 AND is_active = true AND tenant_id = $2',
      [name, tenantContext.tenant_id]
    )
    if (existingShift.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Shift template with this name already exists' }, { status: 409 })
    }

    const result = await query(`
      INSERT INTO shift_templates (
        name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active, created_by, tenant_id, organization_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, NOW(), NOW())
      RETURNING id, name, start_time, end_time, department, color, created_at
    `, [
      name,
      description || null,
      start_time,
      end_time,
      department || 'General',
      required_staff || 1,
      hourly_rate || null,
      color || '#3B82F6',
      created_by || user.id,
      tenantContext.tenant_id,
      tenantContext.organization_id,
    ])

    const template = result.rows[0]
    return NextResponse.json({ success: true, data: template, message: 'Shift template created successfully' })
  } catch (error) {
    console.error('Error creating shift template:', error)
    return NextResponse.json({ success: false, error: 'Failed to create shift template' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active } = body

    if (!id || !name || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: 'Missing required fields: id, name, start_time, end_time' }, { status: 400 })
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json({ success: false, error: 'Invalid time format. Use HH:MM' }, { status: 400 })
    }

    const existingShift = await query('SELECT id FROM shift_templates WHERE id = $1 AND tenant_id = $2', [id, tenantContext.tenant_id])
    if (existingShift.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shift template not found' }, { status: 404 })
    }

    const nameConflict = await query('SELECT id FROM shift_templates WHERE name = $1 AND id != $2 AND is_active = true AND tenant_id = $3', [name, id, tenantContext.tenant_id])
    if (nameConflict.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Shift template with this name already exists' }, { status: 409 })
    }

    const result = await query(`
      UPDATE shift_templates SET
        name = $1, description = $2, start_time = $3, end_time = $4, department = $5, required_staff = $6, hourly_rate = $7, color = $8, is_active = $9, updated_at = NOW()
      WHERE id = $10 AND tenant_id = $11
      RETURNING id, name, start_time, end_time, department, color, is_active, updated_at
    `, [
      name,
      description || null,
      start_time,
      end_time,
      department || 'General',
      required_staff || 1,
      hourly_rate || null,
      color || '#3B82F6',
      is_active !== undefined ? is_active : true,
      id,
      tenantContext.tenant_id,
    ])

    const template = result.rows[0]
    return NextResponse.json({ success: true, data: template, message: 'Shift template updated successfully' })
  } catch (error) {
    console.error('Error updating shift template:', error)
    return NextResponse.json({ success: false, error: 'Failed to update shift template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    if (!templateId) {
      return NextResponse.json({ success: false, error: 'Template ID is required' }, { status: 400 })
    }

    const existingTemplate = await query('SELECT id FROM shift_templates WHERE id = $1 AND tenant_id = $2', [templateId, tenantContext.tenant_id])
    if (existingTemplate.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Shift template not found' }, { status: 404 })
    }

    const activeAssignments = await query('SELECT COUNT(*) as count FROM shift_assignments_new WHERE template_id = $1 AND tenant_id = $2', [templateId, tenantContext.tenant_id])
    if (parseInt(activeAssignments.rows[0].count) > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete template that has active assignments' }, { status: 409 })
    }

    await query('UPDATE shift_templates SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2', [templateId, tenantContext.tenant_id])

    return NextResponse.json({ success: true, message: 'Shift template deleted successfully' })
  } catch (error) {
    console.error('Error deleting shift template:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete shift template' }, { status: 500 })
  }
}
