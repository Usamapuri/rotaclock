import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const result = await query(
      `SELECT t.*
       FROM manager_teams mt
       JOIN teams t ON t.id = mt.team_id
       WHERE mt.manager_id = $1 AND t.is_active = true
       ORDER BY t.created_at ASC`,
      [user!.id]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/project-manager/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, department, team_lead_id, description, project_id } = await request.json()
    if (!name || !department || !team_lead_id) {
      return NextResponse.json({ error: 'name, department, team_lead_id are required' }, { status: 400 })
    }

    // If assigning to a project on create, ensure it's in PM's scope
    if (project_id) {
      const scope = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [user!.id, project_id])
      if (scope.rows.length === 0) return NextResponse.json({ error: 'Forbidden: project not in your domain' }, { status: 403 })
    }

    const leadCheck = await query('SELECT id FROM employees WHERE id = $1 AND is_active = true', [team_lead_id])
    if (leadCheck.rows.length === 0) return NextResponse.json({ error: 'Invalid team_lead_id' }, { status: 400 })

    // Ensure role is team_lead
    await query(`UPDATE employees SET role = 'team_lead', updated_at = NOW() WHERE id = $1`, [team_lead_id])

    const createRes = await query(
      `INSERT INTO teams (name, department, team_lead_id, description, project_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, department, team_lead_id, description || null, project_id || null]
    )
    
    // Add the team to manager_teams table so it appears in the PM's dashboard
    await query(
      `INSERT INTO manager_teams (manager_id, team_id) VALUES ($1, $2)`,
      [user!.id, createRes.rows[0].id]
    )
    
    return NextResponse.json({ success: true, data: createRes.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/project-manager/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


