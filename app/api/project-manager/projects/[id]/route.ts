import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

async function assertInScope(managerId: string, projectId: string) {
  const res = await query('SELECT 1 FROM manager_projects WHERE manager_id = $1 AND project_id = $2', [managerId, projectId])
  return res.rows.length > 0
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    const inScope = await assertInScope(user!.id, projectId)
    if (!inScope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, description, is_active } = updateProjectSchema.parse(body)

    const updates: string[] = []
    const values: any[] = []
    let idx = 1
    if (name !== undefined) { updates.push(`name = $${idx}`); values.push(name); idx++ }
    if (description !== undefined) { updates.push(`description = $${idx}`); values.push(description); idx++ }
    if (is_active !== undefined) { updates.push(`is_active = $${idx}`); values.push(is_active); idx++ }
    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

    values.push(projectId)
    const sql = `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`
    const result = await query(sql, values)
    if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('PUT /api/project-manager/projects/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id
    const inScope = await assertInScope(user!.id, projectId)
    if (!inScope) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await query('UPDATE projects SET is_active = false, updated_at = NOW() WHERE id = $1', [projectId])
    await query('DELETE FROM manager_projects WHERE project_id = $1 AND manager_id = $2', [projectId, user!.id])
    await query('UPDATE teams SET project_id = NULL, updated_at = NOW() WHERE project_id = $1', [projectId])
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/project-manager/projects/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


