import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

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

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150, 'Project name must be less than 150 characters'),
  description: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = createProjectSchema.parse(body)

    const dup = await query('SELECT 1 FROM projects WHERE name = $1 AND is_active = true', [name])
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: 'A project with this name already exists' }, { status: 400 })
    }

    const created = await query('INSERT INTO projects (name, description) VALUES ($1,$2) RETURNING *', [name, description || null])
    const project = created.rows[0]

    // auto-assign the creating PM as manager of this project
    await query(
      `INSERT INTO manager_projects (manager_id, project_id)
       VALUES ($1,$2)
       ON CONFLICT (manager_id, project_id) DO NOTHING`,
      [user!.id, project.id]
    )

    return NextResponse.json({ success: true, data: project, message: 'Project created and assigned to you' }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('POST /api/project-manager/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


