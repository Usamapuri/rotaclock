import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Add authentication middleware
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }
    
    // Ensure the requesting user can only access their own team
    if (leadId !== user!.id) {
      return NextResponse.json({ error: 'Forbidden: Can only access your own team' }, { status: 403 })
    }

    const result = await query(
      `SELECT t.* FROM teams t WHERE t.team_lead_id = $1 AND t.is_active = true ORDER BY t.created_at ASC`,
      [leadId]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams/by-lead error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
