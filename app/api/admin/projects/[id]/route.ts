import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150, 'Project name must be less than 150 characters'),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Get project with manager and team details
    const result = await query(`
      SELECT 
        p.*,
        COALESCE(manager_counts.manager_count, 0) as manager_count,
        COALESCE(team_counts.team_count, 0) as team_count
      FROM projects p
      LEFT JOIN (
        SELECT project_id, COUNT(*) as manager_count
        FROM manager_projects
        GROUP BY project_id
      ) manager_counts ON p.id = manager_counts.project_id
      LEFT JOIN (
        SELECT project_id, COUNT(*) as team_count
        FROM teams
        WHERE project_id IS NOT NULL
        GROUP BY project_id
      ) team_counts ON p.id = team_counts.project_id
      WHERE p.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    })
  } catch (err) {
    console.error('GET /api/admin/projects/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { name, description, is_active } = updateProjectSchema.parse(body)

    // Check if project exists
    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1',
      [id]
    )

    if (existingProject.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if project with same name already exists (excluding current project)
    if (name) {
      const duplicateProject = await query(
        'SELECT id FROM projects WHERE name = $1 AND id != $2 AND is_active = true',
        [name, id]
      )

      if (duplicateProject.rows.length > 0) {
        return NextResponse.json({ 
          error: 'A project with this name already exists' 
        }, { status: 400 })
      }
    }

    // Update project
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (name !== undefined) {
      updateFields.push(`name = $${paramIndex}`)
      updateValues.push(name)
      paramIndex++
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`)
      updateValues.push(description)
      paramIndex++
    }

    if (is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`)
      updateValues.push(is_active)
      paramIndex++
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const result = await query(
      `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    )

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Project updated successfully'
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        error: err.errors[0].message 
      }, { status: 400 })
    }
    
    console.error('PUT /api/admin/projects/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if project exists
    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1',
      [id]
    )

    if (existingProject.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Soft delete the project (set is_active to false)
    await query(
      'UPDATE projects SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    )

    // Remove project manager assignments
    await query(
      'DELETE FROM manager_projects WHERE project_id = $1',
      [id]
    )

    // Remove project_id from teams (set to NULL)
    await query(
      'UPDATE teams SET project_id = NULL, updated_at = NOW() WHERE project_id = $1',
      [id]
    )

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (err) {
    console.error('DELETE /api/admin/projects/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
