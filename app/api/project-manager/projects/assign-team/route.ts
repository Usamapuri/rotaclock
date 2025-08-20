import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const assignTeamSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  team_id: z.string().uuid('Invalid team ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, team_id } = assignTeamSchema.parse(body)

    // Ensure PM manages this project
    const inScope = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [user!.id, project_id])
    if (inScope.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Verify team exists and is active
    const teamCheck = await query('SELECT id, project_id FROM teams WHERE id = $1 AND is_active = true', [team_id])
    if (teamCheck.rows.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    if (teamCheck.rows[0].project_id && teamCheck.rows[0].project_id !== project_id) {
      return NextResponse.json({ error: 'Team is already assigned to another project' }, { status: 400 })
    }

    const result = await query(
      `UPDATE teams SET project_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [project_id, team_id]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('POST /api/project-manager/projects/assign-team error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')
    const team_id = searchParams.get('team_id')
    if (!project_id || !team_id) {
      return NextResponse.json({ error: 'project_id and team_id are required' }, { status: 400 })
    }

    const inScope = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [user!.id, project_id])
    if (inScope.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result = await query(
      `UPDATE teams SET project_id = NULL, updated_at = NOW() WHERE id = $1 AND project_id = $2 RETURNING id`,
      [team_id, project_id]
    )
    if (result.rows.length === 0) return NextResponse.json({ error: 'Team not found or not assigned to this project' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/project-manager/projects/assign-team error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


