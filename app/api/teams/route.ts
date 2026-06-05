import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await query('SELECT * FROM teams WHERE is_active = true ORDER BY created_at ASC')
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


