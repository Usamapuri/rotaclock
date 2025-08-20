import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const assignManagerSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  manager_id: z.string().uuid('Invalid manager ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, manager_id } = assignManagerSchema.parse(body)

    // Ensure the PM manages this project
    const inScope = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [user!.id, project_id])
    if (inScope.rows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Manager must be a project_manager
    const mgr = await query('SELECT id FROM employees WHERE id = $1 AND role = $2 AND is_active = true', [manager_id, 'project_manager'])
    if (mgr.rows.length === 0) return NextResponse.json({ error: 'Employee not found or not a project manager' }, { status: 400 })

    const result = await query(
      `INSERT INTO manager_projects (manager_id, project_id)
       VALUES ($1,$2)
       ON CONFLICT (manager_id, project_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [manager_id, project_id]
    )
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('POST /api/project-manager/projects/assign-manager error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


