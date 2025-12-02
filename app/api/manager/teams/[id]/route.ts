import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const updateTeamSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    department: z.string().optional(),
    team_lead_id: z.string().uuid().optional().nullable(),
})

// PATCH /api/manager/teams/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teamId } = await params
        const authMiddleware = createApiAuthMiddleware()
        const { user, isAuthenticated } = await authMiddleware(request)

        if (!isAuthenticated || !user || user.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const tenantContext = await getTenantContext(user.id)
        if (!tenantContext) {
            return NextResponse.json({ success: false, error: 'No tenant context' }, { status: 403 })
        }

        // Verify manager access to this team
        const accessCheck = await query(`
      SELECT 1 FROM manager_teams 
      WHERE manager_id = $1 AND team_id = $2 AND tenant_id = $3
    `, [user.id, teamId, tenantContext.tenant_id])

        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = updateTeamSchema.parse(body)

        const fields: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (validatedData.name !== undefined) {
            fields.push(`name = $${paramIndex++}`)
            values.push(validatedData.name)
        }
        if (validatedData.description !== undefined) {
            fields.push(`description = $${paramIndex++}`)
            values.push(validatedData.description)
        }
        if (validatedData.department !== undefined) {
            fields.push(`department = $${paramIndex++}`)
            values.push(validatedData.department)
        }
        if (validatedData.team_lead_id !== undefined) {
            fields.push(`team_lead_id = $${paramIndex++}`)
            values.push(validatedData.team_lead_id)
        }

        if (fields.length === 0) {
            return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 })
        }

        fields.push(`updated_at = NOW()`)
        values.push(teamId)
        values.push(tenantContext.tenant_id)

        const updateQuery = `
      UPDATE teams
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `

        const result = await query(updateQuery, values)

        return NextResponse.json({
            success: true,
            data: result.rows[0],
            message: 'Team updated successfully'
        })

    } catch (error) {
        console.error('Error updating team:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/manager/teams/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: teamId } = await params
        const authMiddleware = createApiAuthMiddleware()
        const { user, isAuthenticated } = await authMiddleware(request)

        if (!isAuthenticated || !user || user.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const tenantContext = await getTenantContext(user.id)
        if (!tenantContext) {
            return NextResponse.json({ success: false, error: 'No tenant context' }, { status: 403 })
        }

        // Verify manager access
        const accessCheck = await query(`
      SELECT 1 FROM manager_teams 
      WHERE manager_id = $1 AND team_id = $2 AND tenant_id = $3
    `, [user.id, teamId, tenantContext.tenant_id])

        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        // Soft delete
        await query(`
      UPDATE teams SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [teamId, tenantContext.tenant_id])

        return NextResponse.json({
            success: true,
            message: 'Team deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting team:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
