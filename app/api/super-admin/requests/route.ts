import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin, withRlsTenant } from '@/lib/api-auth'

const authMiddleware = createApiAuthMiddleware()

async function _GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const params: unknown[] = []
    let i = 1
    let sql = `
      SELECT 
        r.id,
        r.status,
        r.payload,
        r.reviewed_at,
        r.rejection_reason,
        r.created_organization_id,
        r.created_admin_employee_id,
        r.created_at,
        r.updated_at
      FROM tenant_signup_requests r
      WHERE 1=1
    `

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      sql += ` AND r.status = $${i}`
      params.push(status)
      i++
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${i} OFFSET $${i + 1}`
    params.push(200, 0)

    const result = await query(sql, params)

    return NextResponse.json({ success: true, data: result.rows })
  } catch (e) {
    console.error('GET super-admin requests', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
