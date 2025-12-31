import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenant = await getTenantContext(user.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('manager_id')

    let queryText = `
      SELECT id, name, description, is_active, manager_id, created_at, updated_at
      FROM locations WHERE tenant_id = $1
    `
    const params: any[] = [tenant.tenant_id]

    // Filter by manager_id if provided
    if (managerId) {
      queryText += ` AND manager_id = $2`
      params.push(managerId)
    }

    queryText += ` ORDER BY name`

    const result = await query(queryText, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load locations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenant = await getTenantContext(user.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

    const { name, description } = await request.json()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const inserted = await query(`
      INSERT INTO locations (tenant_id, organization_id, name, description, is_active, created_by)
      VALUES ($1,$2,$3,$4,true,$5)
      RETURNING id, name, description, is_active
    `, [tenant.tenant_id, tenant.organization_id, name, description || null, user.id])

    return NextResponse.json({ success: true, data: inserted.rows[0] })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}


