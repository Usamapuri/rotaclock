import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from '@/lib/database'

async function _GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await query('SELECT * FROM projects WHERE is_active = true ORDER BY created_at ASC')
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function _POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const name = (body?.name || '').trim()
    const description = body?.description || null
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
    const result = await query('INSERT INTO projects (name, description) VALUES ($1,$2) RETURNING *', [name, description])
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
export const POST = withRlsTenant(_POST)
