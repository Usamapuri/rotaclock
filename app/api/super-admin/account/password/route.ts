import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin, withRlsTenant } from '@/lib/api-auth'

const authMiddleware = createApiAuthMiddleware()

async function _POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'currentPassword and newPassword are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
    }

    const res = await query(
      `SELECT id, password_hash FROM super_admins WHERE id = $1 AND is_active = true`,
      [user.id]
    )
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const row = res.rows[0]
    const ok = await bcrypt.compare(currentPassword, row.password_hash)
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await query(`UPDATE super_admins SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, user.id])

    return NextResponse.json({ success: true, message: 'Password updated' })
  } catch (e) {
    console.error('POST super-admin account password', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const POST = withRlsTenant(_POST)
