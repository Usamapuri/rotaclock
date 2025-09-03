import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const result = await query(`
      SELECT id, name, display_name, description, permissions, dashboard_access, is_active, created_at, updated_at
      FROM roles 
      WHERE is_active = true AND tenant_id = $1
      ORDER BY name
    `, [tenant.tenant_id])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { name, display_name, description, permissions, dashboard_access } = await request.json()

    if (!name || !display_name) {
      return NextResponse.json({ error: 'Name and display name are required' }, { status: 400 })
    }

    const result = await query(`
      INSERT INTO roles (
        name, display_name, description, permissions, dashboard_access, tenant_id, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name,
      display_name,
      description || '',
      JSON.stringify(permissions || {}),
      JSON.stringify(dashboard_access || []),
      tenant.tenant_id,
      tenant.organization_id,
    ])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
  }
}
