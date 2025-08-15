import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    if (!leadId) return NextResponse.json({ error: 'leadId is required' }, { status: 400 })

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
