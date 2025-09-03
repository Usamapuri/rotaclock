import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

const assignManagerSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  manager_id: z.string().uuid('Invalid manager ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const body = await request.json()
    const { project_id, manager_id } = assignManagerSchema.parse(body)

    const managerCheck = await query('SELECT id, role FROM employees_new WHERE id = $1 AND role = $2 AND is_active = true AND tenant_id = $3', [manager_id, 'project_manager', tenant.tenant_id])
    if (managerCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found or not a project manager' }, { status: 400 })
    }

    const projectCheck = await query('SELECT id FROM projects WHERE id = $1 AND is_active = true AND tenant_id = $2', [project_id, tenant.tenant_id])
    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO manager_projects (manager_id, project_id, tenant_id, organization_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (manager_id, project_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [manager_id, project_id, tenant.tenant_id, tenant.organization_id]
    )

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Project manager assigned successfully' })
  } catch (error) {
    console.error('Error assigning project manager:', error)
    return NextResponse.json({ error: 'Failed to assign project manager' }, { status: 500 })
  }
}
