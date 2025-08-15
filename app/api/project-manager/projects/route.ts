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
    const result = await query(
      `SELECT p.* FROM manager_projects mp JOIN projects p ON p.id = mp.project_id WHERE mp.manager_id = $1 AND p.is_active = true ORDER BY p.created_at ASC`,
      [user!.id]
    )
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/project-manager/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


