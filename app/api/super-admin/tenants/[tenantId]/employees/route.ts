import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'

const authMiddleware = createApiAuthMiddleware()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tenantId } = await params
    const enc = tenantId

    const orgCheck = await query(`SELECT id FROM organizations WHERE tenant_id = $1 LIMIT 1`, [enc])
    if (orgCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const result = await query(
      `
      SELECT e.id, e.email, e.employee_code, e.first_name, e.last_name, e.role, e.is_active, e.created_at
      FROM employees e
      WHERE e.tenant_id = $1
      ORDER BY e.role = 'admin' DESC, e.email ASC
      LIMIT 500
    `,
      [enc]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (e) {
    console.error('GET tenant employees', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
