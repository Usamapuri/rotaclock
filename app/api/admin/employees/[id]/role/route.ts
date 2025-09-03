import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { id } = params
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    const result = await query(
      `SELECT e.employee_code as employee_id, e.email, e.first_name, e.last_name, e.role,
              r.display_name as role_display_name, r.description as role_description, r.permissions, r.dashboard_access
       FROM employees e
       LEFT JOIN roles r ON e.role = r.name AND r.tenant_id = e.tenant_id
       WHERE ${isUuid ? 'e.id' : 'e.email'} = $1 AND e.tenant_id = $2`,
      [id, tenant.tenant_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching employee role:', error)
    return NextResponse.json({ error: 'Failed to fetch employee role' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { id } = params
    const { new_role, reason, assigned_by } = await request.json()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (!new_role) {
      return NextResponse.json({ error: 'New role is required' }, { status: 400 })
    }

    const currentRoleResult = await query(
      `SELECT role, email FROM employees WHERE ${isUuid ? 'id' : 'email'} = $1 AND tenant_id = $2`,
      [id, tenant.tenant_id]
    )

    if (currentRoleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const old_role = currentRoleResult.rows[0].role
    const email = currentRoleResult.rows[0].email

    await query(
      `UPDATE employees SET role = $1, updated_at = NOW() WHERE ${isUuid ? 'id' : 'email'} = $2 AND tenant_id = $3`,
      [new_role, id, tenant.tenant_id]
    )

    await query(
      `INSERT INTO role_assignments (
         employee_id, employee_email, old_role, new_role, assigned_by, reason, tenant_id, organization_id
       ) VALUES (
         (SELECT employee_code FROM employees WHERE ${isUuid ? 'id' : 'email'} = $1 AND tenant_id = $2),
         $3, $4, $5, $6, $7, $2, $8
       )`,
      [id, tenant.tenant_id, email, old_role, new_role, assigned_by || user!.id, reason || 'Role update', tenant.organization_id]
    )

    const result = await query(
      `SELECT e.employee_code as employee_id, e.email, e.first_name, e.last_name, e.role,
              r.display_name as role_display_name, r.description as role_description, r.permissions, r.dashboard_access
       FROM employees e
       LEFT JOIN roles r ON e.role = r.name AND r.tenant_id = e.tenant_id
       WHERE ${isUuid ? 'e.id' : 'e.email'} = $1 AND e.tenant_id = $2`,
      [id, tenant.tenant_id]
    )

    return NextResponse.json({ success: true, message: 'Role updated successfully', employee: result.rows[0], old_role, new_role })
  } catch (error) {
    console.error('Error updating employee role:', error)
    return NextResponse.json({ error: 'Failed to update employee role' }, { status: 500 })
  }
}
