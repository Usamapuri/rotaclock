import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

const changeLeadSchema = z.object({
  new_team_lead_id: z.string().uuid('Invalid team lead ID')
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await getTenantContext(user!.id)
    if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { id: teamId } = params
    const body = await request.json()
    const { new_team_lead_id } = changeLeadSchema.parse(body)

    const teamCheck = await query('SELECT id, team_lead_id FROM teams WHERE id = $1 AND is_active = true AND tenant_id = $2', [teamId, tenant.tenant_id])
    if (teamCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const currentTeamLeadId = teamCheck.rows[0].team_lead_id

    const newLeadCheck = await query('SELECT id FROM employees_new WHERE id = $1 AND is_active = true AND tenant_id = $2', [new_team_lead_id, tenant.tenant_id])
    if (newLeadCheck.rows.length === 0) {
      return NextResponse.json({ error: 'New team lead not found' }, { status: 404 })
    }

    const existingLeadCheck = await query('SELECT id FROM teams WHERE team_lead_id = $1 AND id != $2 AND is_active = true AND tenant_id = $3', [new_team_lead_id, teamId, tenant.tenant_id])
    if (existingLeadCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Employee is already a team lead of another team' }, { status: 400 })
    }

    const result = await query(
      `UPDATE teams SET team_lead_id = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [new_team_lead_id, teamId, tenant.tenant_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update team lead' }, { status: 500 })
    }

    if (currentTeamLeadId && currentTeamLeadId !== new_team_lead_id) {
      console.log(`Previous team lead ${currentTeamLeadId} replaced with ${new_team_lead_id}`)
    }

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Team lead changed successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error changing team lead:', error)
    return NextResponse.json({ error: 'Failed to change team lead' }, { status: 500 })
  }
}
