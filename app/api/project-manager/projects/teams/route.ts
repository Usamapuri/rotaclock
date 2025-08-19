import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 })

    // Ensure project is in PM domain
    const scope = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [user!.id, projectId])
    if (scope.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const teams = await query('SELECT * FROM teams WHERE project_id = $1 AND is_active = true ORDER BY created_at ASC', [projectId])
    return NextResponse.json({ success: true, data: teams.rows })
  } catch (err) {
    console.error('GET /api/project-manager/projects/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


