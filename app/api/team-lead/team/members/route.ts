import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }
    
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }
    
    const result = await query(
      `SELECT e.id, e.first_name, e.last_name, e.email, e.employee_id, e.is_active
       FROM employees e
       WHERE e.team_id = $1 AND e.is_active = true
       ORDER BY e.first_name, e.last_name`,
      [team.id]
    )
    
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Error in GET /api/team-lead/team/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
