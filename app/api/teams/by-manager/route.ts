import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { query } from '@/lib/database'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    if (!managerId) return NextResponse.json({ error: 'managerId is required' }, { status: 400 })

    const result = await query(
      `SELECT t.*
       FROM manager_teams mt
       JOIN teams t ON t.id = mt.team_id
       WHERE mt.manager_id = $1 AND t.is_active = true AND t.tenant_id = $2
       ORDER BY t.created_at ASC`,
      [managerId, tenantContext.tenant_id]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams/by-manager error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


