import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const tenant = await getTenantContext(user.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const teamId = params.id
    const { team_lead_id } = await request.json()
    if (!team_lead_id) return NextResponse.json({ error: 'team_lead_id is required' }, { status: 400 })

    const team = await query('SELECT id FROM teams WHERE id = $1 AND tenant_id = $2', [teamId, tenant.tenant_id])
    if (team.rows.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const emp = await query('SELECT id FROM employees_new WHERE id = $1 AND is_active = true AND tenant_id = $2', [team_lead_id, tenant.tenant_id])
    if (emp.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    await query("UPDATE employees_new SET role = 'team_lead', updated_at = NOW() WHERE id = $1 AND tenant_id = $2", [team_lead_id, tenant.tenant_id])

    const updated = await query('UPDATE teams SET team_lead_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *', [team_lead_id, teamId, tenant.tenant_id])

    return NextResponse.json({ success: true, data: updated.rows[0], message: 'Team lead reassigned' })
  } catch (err) {
    console.error('POST /api/admin/teams/[id]/assign-lead error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
