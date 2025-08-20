import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'

async function isTeamInScope(managerId: string, teamId: string) {
  const res = await query(
    `SELECT 1 FROM manager_teams WHERE manager_id = $1 AND team_id = $2
     UNION
     SELECT 1 FROM manager_projects mp JOIN teams t ON t.project_id = mp.project_id
       WHERE mp.manager_id = $1 AND t.id = $2
     LIMIT 1`,
    [managerId, teamId]
  )
  return res.rows.length > 0
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const teamId = params.id
    const inScope = await isTeamInScope(user!.id, teamId)
    if (!inScope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await query(
      `SELECT t.*, e.first_name as team_lead_first_name, e.last_name as team_lead_last_name, e.email as team_lead_email,
        (SELECT COUNT(*) FROM employees m WHERE m.team_id = t.id AND m.is_active = true) as member_count
       FROM teams t
       LEFT JOIN employees e ON t.team_lead_id = e.id
       WHERE t.id = $1`,
      [teamId]
    )
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('GET /api/project-manager/teams/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const teamId = params.id
    const inScope = await isTeamInScope(user!.id, teamId)
    if (!inScope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, department, team_lead_id, description, is_active } = body

    const updates: string[] = []
    const values: any[] = []
    let idx = 1
    if (name !== undefined) { updates.push(`name = $${idx}`); values.push(name); idx++ }
    if (department !== undefined) { updates.push(`department = $${idx}`); values.push(department); idx++ }
    if (team_lead_id !== undefined) { updates.push(`team_lead_id = $${idx}`); values.push(team_lead_id); idx++ }
    if (description !== undefined) { updates.push(`description = $${idx}`); values.push(description); idx++ }
    if (is_active !== undefined) { updates.push(`is_active = $${idx}`); values.push(!!is_active); idx++ }
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    values.push(teamId)
    const sql = `UPDATE teams SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`
    const result = await query(sql, values)
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('PUT /api/project-manager/teams/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


