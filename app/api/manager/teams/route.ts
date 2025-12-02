import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const createTeamSchema = z.object({
    name: z.string().min(1, 'Team name is required').max(255),
    description: z.string().optional(),
    department: z.string().optional(),
})

// GET /api/manager/teams
// List teams for manager's locations
export async function GET(request: NextRequest) {
    try {
        const authMiddleware = createApiAuthMiddleware()
        const { user, isAuthenticated } = await authMiddleware(request)

        if (!isAuthenticated || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (user.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const tenantContext = await getTenantContext(user.id)
        if (!tenantContext) {
            return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
        }

        // Get teams that are either:
        // 1. Explicitly assigned to the manager via manager_teams (if that table is used)
        // 2. OR contain employees from the manager's locations (implicit ownership)
        // 3. OR created by the manager (if we tracked that, but teams table doesn't have created_by)
        // For now, let's show teams that have at least one member in the manager's locations, OR empty teams created by this manager (if we add created_by later).
        // Actually, a simpler approach for now: Show ALL teams in the tenant, but maybe flag if they are relevant?
        // User requirement: "manager has location specific admin like access".
        // So maybe we should only show teams that are "associated" with the manager's locations.
        // But teams don't have location_id.
        // Let's look at `manager_teams` table in schema.
        // `manager_teams` table exists! `manager_id`, `team_id`.
        // So we should use that table to link managers to teams.
        // AND/OR we can allow managers to create teams and automatically link them.

        const teamsQuery = `
      SELECT t.*, 
        (SELECT COUNT(*) FROM team_assignments ta WHERE ta.team_id = t.id AND ta.is_active = true) as member_count,
        e.first_name as lead_first_name, e.last_name as lead_last_name
      FROM teams t
      JOIN manager_teams mt ON t.id = mt.team_id
      LEFT JOIN employees e ON t.team_lead_id = e.id
      WHERE mt.manager_id = $1 AND mt.tenant_id = $2 AND t.is_active = true
      ORDER BY t.name
    `

        const result = await query(teamsQuery, [user.id, tenantContext.tenant_id])

        return NextResponse.json({
            success: true,
            data: result.rows
        })

    } catch (error) {
        console.error('Error fetching manager teams:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/manager/teams
// Create a new team
export async function POST(request: NextRequest) {
    try {
        const authMiddleware = createApiAuthMiddleware()
        const { user, isAuthenticated } = await authMiddleware(request)

        if (!isAuthenticated || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (user.role !== 'manager') {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const tenantContext = await getTenantContext(user.id)
        if (!tenantContext) {
            return NextResponse.json({ success: false, error: 'No tenant context found' }, { status: 403 })
        }

        const body = await request.json()
        const validatedData = createTeamSchema.parse(body)

        // Start transaction
        await query('BEGIN')

        try {
            // 1. Create Team
            const createTeamQuery = `
        INSERT INTO teams (tenant_id, organization_id, name, description, department, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `
            const teamResult = await query(createTeamQuery, [
                tenantContext.tenant_id,
                tenantContext.organization_id,
                validatedData.name,
                validatedData.description || null,
                validatedData.department || null
            ])
            const newTeam = teamResult.rows[0]

            // 2. Link to Manager
            await query(`
        INSERT INTO manager_teams (tenant_id, manager_id, team_id)
        VALUES ($1, $2, $3)
      `, [tenantContext.tenant_id, user.id, newTeam.id])

            await query('COMMIT')

            return NextResponse.json({
                success: true,
                data: newTeam,
                message: 'Team created successfully'
            }, { status: 201 })

        } catch (err) {
            await query('ROLLBACK')
            throw err
        }

    } catch (error) {
        console.error('Error creating team:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation error', details: error.errors }, { status: 400 })
        }
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
