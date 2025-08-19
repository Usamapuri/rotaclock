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


