import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const transferSchema = z.object({
  employee_id: z.string().uuid('Invalid employee ID'),
  target_team_id: z.string().uuid('Invalid team ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employee_id, target_team_id } = transferSchema.parse(body)

    // Ensure target team is within PM domain (either direct team mapping or via managed project)
    const targetInScope = await query(
      `SELECT 1 FROM manager_teams WHERE manager_id = $1 AND team_id = $2
       UNION
       SELECT 1 FROM manager_projects mp JOIN teams t ON t.project_id = mp.project_id
        WHERE mp.manager_id = $1 AND t.id = $2
       LIMIT 1`,
      [user!.id, target_team_id]
    )
    if (targetInScope.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden: target team not in your domain' }, { status: 403 })
    }

    // Ensure current employee team is within PM domain (or employee unassigned)
    const empRes = await query('SELECT id, team_id FROM employees WHERE id = $1 AND is_active = true', [employee_id])
    if (empRes.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    const currentTeamId = empRes.rows[0].team_id as string | null
    if (currentTeamId) {
      const currentInScope = await query(
        `SELECT 1 FROM manager_teams WHERE manager_id = $1 AND team_id = $2
         UNION
         SELECT 1 FROM manager_projects mp JOIN teams t ON t.project_id = mp.project_id
          WHERE mp.manager_id = $1 AND t.id = $2
         LIMIT 1`,
        [user!.id, currentTeamId]
      )
      if (currentInScope.rows.length === 0) {
        return NextResponse.json({ error: 'Forbidden: employee team not in your domain' }, { status: 403 })
      }
    }

    // Transfer: update employees.team_id and add a team_assignments record
    const result = await transaction(async (client) => {
      await client.query('UPDATE employees SET team_id = $1, updated_at = NOW() WHERE id = $2', [target_team_id, employee_id])
      await client.query(
        `INSERT INTO team_assignments (employee_id, team_id, assigned_date, is_active)
         VALUES ($1,$2,CURRENT_DATE,true)
         ON CONFLICT (employee_id, team_id, assigned_date) DO UPDATE SET is_active = true, updated_at = NOW()`,
        [employee_id, target_team_id]
      )
      return { employee_id, target_team_id }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/project-manager/teams/transfer-employee error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


