import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const managerId = searchParams.get('managerId')
    if (!managerId) return NextResponse.json({ error: 'managerId is required' }, { status: 400 })

    const result = await query(
      `SELECT t.*
       FROM manager_teams mt
       JOIN teams t ON t.id = mt.team_id
       WHERE mt.manager_id = $1 AND t.is_active = true
       ORDER BY t.created_at ASC`,
      [managerId]
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams/by-manager error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


