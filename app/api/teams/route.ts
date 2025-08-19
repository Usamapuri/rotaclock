import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const result = await query('SELECT * FROM teams WHERE is_active = true ORDER BY created_at ASC')
    return NextResponse.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('GET /api/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = (body?.name || '').trim()
    const department = body?.department || null
    const description = body?.description || null
    const project_id = body?.project_id || null
    
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    const result = await query(
      'INSERT INTO teams (name, department, description, project_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, department, description, project_id]
    )

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/teams error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


