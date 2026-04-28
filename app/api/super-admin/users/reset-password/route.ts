import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'
import { insertPlatformAuditLog } from '@/lib/platform-audit'

const authMiddleware = createApiAuthMiddleware()

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const employeeId = typeof body.employeeId === 'string' ? body.employeeId.trim() : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!employeeId || !newPassword) {
      return NextResponse.json({ error: 'employeeId and newPassword are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const emp = await query(
      `SELECT id, email, tenant_id, first_name, last_name FROM employees WHERE id = $1 AND is_active = true`,
      [employeeId]
    )
    if (emp.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const row = emp.rows[0]
    const hash = await bcrypt.hash(newPassword, 12)
    await query(`UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [hash, employeeId])

    await insertPlatformAuditLog({
      superAdminId: user.id,
      action: 'tenant_user_password_reset',
      subjectTenantId: row.tenant_id,
      subjectUserId: row.id,
      details: {
        target_email: row.email,
        super_admin_email: user.email,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Password updated for ' + row.email,
    })
  } catch (e) {
    console.error('POST reset tenant user password', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
