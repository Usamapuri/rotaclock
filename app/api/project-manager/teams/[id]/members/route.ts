import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

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

const addMemberSchema = z.object({ employee_id: z.string().uuid() })

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
      `SELECT e.id, e.first_name, e.last_name, e.email, e.position, e.employee_id, e.created_at as joined_date, 'member' as role
       FROM employees e WHERE e.team_id = $1 AND e.is_active = true ORDER BY e.first_name, e.last_name`,
      [teamId]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/project-manager/teams/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { employee_id } = addMemberSchema.parse(body)

    const employeeCheck = await query('SELECT id, team_id FROM employees WHERE id = $1 AND is_active = true', [employee_id])
    if (employeeCheck.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    if (employeeCheck.rows[0].team_id) return NextResponse.json({ error: 'Employee is already assigned to a team' }, { status: 400 })

    const result = await query('UPDATE employees SET team_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [teamId, employee_id])
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('POST /api/project-manager/teams/[id]/members error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


