import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from '@/lib/database'

// POST /api/scheduling/assign/clear
// Danger: deletes all shift assignments (testing only)
async function _POST(_request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(_request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const countRes = await query('SELECT COUNT(*)::int AS cnt FROM shift_assignments_new', [])
    const count = countRes.rows[0]?.cnt ?? 0
    await query('DELETE FROM shift_assignments_new', [])
    return NextResponse.json({ success: true, deleted: count })
  } catch (error) {
    console.error('Error clearing assignments:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear assignments' }, { status: 500 })
  }
}



// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const POST = withRlsTenant(_POST)
