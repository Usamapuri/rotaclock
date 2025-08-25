import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

// POST /api/scheduling/assign/clear
// Danger: deletes all shift assignments (testing only)
export async function POST(_request: NextRequest) {
  try {
    const countRes = await query('SELECT COUNT(*)::int AS cnt FROM shift_assignments_new', [])
    const count = countRes.rows[0]?.cnt ?? 0
    await query('DELETE FROM shift_assignments_new', [])
    return NextResponse.json({ success: true, deleted: count })
  } catch (error) {
    console.error('Error clearing assignments:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear assignments' }, { status: 500 })
  }
}


