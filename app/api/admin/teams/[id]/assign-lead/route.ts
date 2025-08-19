import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const teamId = params.id
    const { team_lead_id } = await request.json()
    if (!team_lead_id) return NextResponse.json({ error: 'team_lead_id is required' }, { status: 400 })

    // Validate team exists
    const team = await query('SELECT id FROM teams WHERE id = $1', [teamId])
    if (team.rows.length === 0) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    // Validate employee exists
    const emp = await query('SELECT id FROM employees WHERE id = $1', [team_lead_id])
    if (emp.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    // Set role to team_lead
    await query("UPDATE employees SET role = 'team_lead', updated_at = NOW() WHERE id = $1", [team_lead_id])

    // Assign to team
    const updated = await query('UPDATE teams SET team_lead_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [team_lead_id, teamId])

    return NextResponse.json({ success: true, data: updated.rows[0], message: 'Team lead reassigned' })
  } catch (err) {
    console.error('POST /api/admin/teams/[id]/assign-lead error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
