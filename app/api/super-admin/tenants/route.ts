import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'

const authMiddleware = createApiAuthMiddleware()

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    let sql = `
      SELECT 
        id,
        tenant_id,
        name,
        slug,
        email,
        phone,
        subscription_status,
        subscription_plan,
        trial_end_date,
        max_employees,
        is_active,
        is_verified,
        created_at
      FROM organizations
      WHERE 1=1
    `
    const params: (string | number)[] = []
    if (q) {
      params.push(`%${q.toLowerCase()}%`)
      sql += ` AND (
        LOWER(name) LIKE $${params.length}
        OR LOWER(email) LIKE $${params.length}
        OR LOWER(tenant_id) LIKE $${params.length}
      )`
    }
    params.push(limit)
    const limIdx = params.length
    params.push(offset)
    const offIdx = params.length
    sql += ` ORDER BY created_at DESC LIMIT $${limIdx} OFFSET $${offIdx}`

    const result = await query(sql, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (e) {
    console.error('GET super-admin tenants', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
