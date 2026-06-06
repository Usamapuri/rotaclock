import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from '@/lib/database'
import { getTenantContext } from '@/lib/tenant'

async function _GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const result = await query(
      'SELECT * FROM teams WHERE tenant_id = $1 AND is_active = true ORDER BY created_at ASC',
      [tenantContext.tenant_id]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
