import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150, 'Project name must be less than 150 characters'),
  description: z.string().optional()
})

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150, 'Project name must be less than 150 characters'),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get projects with manager and team counts for current tenant
    const result = await query(`
      SELECT 
        p.*,
        COALESCE(manager_counts.manager_count, 0) as manager_count,
        COALESCE(team_counts.team_count, 0) as team_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) as manager_count
        FROM manager_projects
        WHERE tenant_id = $1
        GROUP BY project_id
      ) manager_counts ON p.id = manager_counts.project_id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as team_count
        FROM teams
        WHERE tenant_id = $1 AND project_id IS NOT NULL
        GROUP BY project_id
      ) team_counts ON p.id = team_counts.project_id
      WHERE p.tenant_id = $1 AND p.is_active = true
      ORDER BY p.created_at DESC
    `, [user.tenant_id])

    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    })
  } catch (err) {
    console.error('GET /api/admin/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = createProjectSchema.parse(body)

    // Check if project with same name already exists for this tenant
    const existingProject = await query(
      'SELECT id FROM projects WHERE tenant_id = $1 AND name = $2 AND is_active = true',
      [user.tenant_id, name]
    )

    if (existingProject.rows.length > 0) {
      return NextResponse.json({ 
        error: 'A project with this name already exists' 
      }, { status: 400 })
    }

    // Create new project
    const result = await query(
      'INSERT INTO projects (tenant_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [user.tenant_id, name, description]
    )

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Project created successfully'
    }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        error: err.errors[0].message 
      }, { status: 400 })
    }
    
    console.error('POST /api/admin/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
