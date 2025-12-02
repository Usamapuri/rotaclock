import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

const addMemberSchema = z.object({
    employee_id: z.string().uuid(),
    role: z.string().default('member')
})

// POST /api/manager/teams/[id]/members
// Add member to team
export async function POST(
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

        // Verify manager access to team
        const accessCheck = await query(`
      SELECT 1 FROM manager_teams 
      WHERE manager_id = $1 AND team_id = $2 AND tenant_id = $3
    `, [user.id, teamId, tenantContext.tenant_id])

        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const { employee_id, role } = addMemberSchema.parse(body)

        // Verify manager has access to this employee (location check)
        const employeeCheck = await query(`
      SELECT 1 FROM employees e
      JOIN manager_locations ml ON e.location_id = ml.location_id
      WHERE e.id = $1 AND ml.manager_id = $2 AND e.tenant_id = $3
    `, [employee_id, user.id, tenantContext.tenant_id])

        if (employeeCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'You can only add employees from your assigned locations' }, { status: 403 })
        }

        // Start transaction
        await query('BEGIN')

        try {
            // 1. Add to team_assignments
            await query(`
        INSERT INTO team_assignments (tenant_id, team_id, employee_id, assigned_date, role, assigned_by)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
        ON CONFLICT (tenant_id, team_id, employee_id, assigned_date) DO NOTHING
      `, [tenantContext.tenant_id, teamId, employee_id, role, user.id])

            // 2. Update employees.team_id (primary team)
            await query(`
        UPDATE employees SET team_id = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `, [teamId, employee_id, tenantContext.tenant_id])

            await query('COMMIT')

            return NextResponse.json({
                success: true,
                message: 'Member added successfully'
            })

        } catch (err) {
            await query('ROLLBACK')
            throw err
        }

    } catch (error) {
        console.error('Error adding team member:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/manager/teams/[id]/members
// Remove member from team
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

        // Verify manager access to team
        const accessCheck = await query(`
      SELECT 1 FROM manager_teams 
      WHERE manager_id = $1 AND team_id = $2 AND tenant_id = $3
    `, [user.id, teamId, tenantContext.tenant_id])

        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get('employee_id')

        if (!employeeId) {
            return NextResponse.json({ success: false, error: 'Employee ID required' }, { status: 400 })
        }

        // Start transaction
        await query('BEGIN')

        try {
            // 1. Deactivate team assignment
            await query(`
        UPDATE team_assignments 
        SET is_active = false 
        WHERE team_id = $1 AND employee_id = $2 AND tenant_id = $3
      `, [teamId, employeeId, tenantContext.tenant_id])

            // 2. Clear employees.team_id if it matches
            await query(`
        UPDATE employees 
        SET team_id = NULL, updated_at = NOW()
        WHERE id = $1 AND team_id = $2 AND tenant_id = $3
      `, [employeeId, teamId, tenantContext.tenant_id])

            await query('COMMIT')

            return NextResponse.json({
                success: true,
                message: 'Member removed successfully'
            })

        } catch (err) {
            await query('ROLLBACK')
            throw err
        }

    } catch (error) {
        console.error('Error removing team member:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
