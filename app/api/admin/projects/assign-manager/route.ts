import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const assignManagerSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  manager_id: z.string().uuid('Invalid manager ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, manager_id } = assignManagerSchema.parse(body)

    // Verify the manager is a project_manager
    const managerCheck = await query(
      'SELECT id, role FROM employees WHERE id = $1 AND role = $2 AND is_active = true',
      [manager_id, 'project_manager']
    )

    if (managerCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found or not a project manager' },
        { status: 400 }
      )
    }

    // Verify the project exists
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1 AND is_active = true',
      [project_id]
    )

    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 400 }
      )
    }

    // Assign manager to project
    const result = await query(
      `INSERT INTO manager_projects (manager_id, project_id)
       VALUES ($1, $2)
       ON CONFLICT (manager_id, project_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [manager_id, project_id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Project manager assigned successfully'
    })

  } catch (error) {
    console.error('Error assigning project manager:', error)
    return NextResponse.json(
      { error: 'Failed to assign project manager' },
      { status: 500 }
    )
  }
}
