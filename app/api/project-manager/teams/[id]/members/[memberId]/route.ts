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

export async function DELETE(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamId = params.id
    const memberId = params.memberId
    const inScope = await isTeamInScope(user!.id, teamId)
    if (!inScope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const teamCheck = await query('SELECT id FROM teams WHERE id = $1 AND is_active = true', [teamId])
    if (teamCheck.rows.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    const employeeCheck = await query('SELECT id FROM employees WHERE id = $1 AND team_id = $2 AND is_active = true', [memberId, teamId])
    if (employeeCheck.rows.length === 0) return NextResponse.json({ error: 'Employee not found in this team' }, { status: 404 })

    const result = await query('UPDATE employees SET team_id = NULL, updated_at = NOW() WHERE id = $1 AND team_id = $2 RETURNING id', [memberId, teamId])
    if (result.rows.length === 0) return NextResponse.json({ error: 'Failed to remove employee from team' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/project-manager/teams/[id]/members/[memberId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


