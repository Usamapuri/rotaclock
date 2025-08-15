import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const assignLeadSchema = z.object({
  team_id: z.string().uuid('Invalid team ID'),
  lead_id: z.string().uuid('Invalid lead ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isProjectManager(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { team_id, lead_id } = assignLeadSchema.parse(body)

    // Verify the team is within PM's domain
    const teamInScope = await query(
      `SELECT 1 FROM manager_teams WHERE manager_id = $1 AND team_id = $2
       UNION
       SELECT 1 FROM manager_projects mp JOIN teams t ON t.project_id = mp.project_id
        WHERE mp.manager_id = $1 AND t.id = $2
       LIMIT 1`,
      [user!.id, team_id]
    )

    if (teamInScope.rows.length === 0) {
      return NextResponse.json(
        { error: 'Forbidden: team not in your domain' },
        { status: 403 }
      )
    }

    // Verify the lead is a team_lead
    const leadCheck = await query(
      'SELECT id, role FROM employees WHERE id = $1 AND role = $2 AND is_active = true',
      [lead_id, 'team_lead']
    )

    if (leadCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found or not a team lead' },
        { status: 400 }
      )
    }

    // Assign team lead to team
    const result = await query(
      `UPDATE teams 
       SET team_lead_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [lead_id, team_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Team lead assigned successfully'
    })

  } catch (error) {
    console.error('Error assigning team lead:', error)
    return NextResponse.json(
      { error: 'Failed to assign team lead' },
      { status: 500 }
    )
  }
}
