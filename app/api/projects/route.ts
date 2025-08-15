import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT * FROM projects WHERE is_active = true ORDER BY created_at ASC')
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/projects error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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


