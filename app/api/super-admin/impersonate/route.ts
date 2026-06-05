import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'
import { insertPlatformAuditLog } from '@/lib/platform-audit'
import { createSessionToken, setSessionCookie } from '@/lib/session'

const authMiddleware = createApiAuthMiddleware()

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
    }

    const targetUserResult = await query(
      `
      SELECT 
        e.id,
        e.employee_code AS employee_id,
        e.email,
        e.first_name,
        e.last_name,
        e.role,
        e.department,
        e.job_position AS position,
        e.is_active,
        e.tenant_id,
        e.organization_id,
        o.name AS organization_name
      FROM employees e
      LEFT JOIN organizations o ON o.id = e.organization_id
      WHERE e.id = $1 AND e.is_active = true
    `,
      [targetUserId]
    )

    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target user not found or inactive' }, { status: 404 })
    }

    const targetUser = targetUserResult.rows[0]

    await insertPlatformAuditLog({
      superAdminId: user.id,
      action: 'support_impersonation_start',
      subjectTenantId: targetUser.tenant_id,
      subjectUserId: targetUser.id,
      details: {
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
        super_admin_email: user.email,
      },
    })

    const token = await createSessionToken({
      id: targetUser.id,
      role: targetUser.role,
      email: targetUser.email,
      imp: { id: user.id, role: 'super_admin', email: user.email },
    })
    const response = NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        employee_id: targetUser.employee_id,
        email: targetUser.email,
        first_name: targetUser.first_name,
        last_name: targetUser.last_name,
        role: targetUser.role,
        department: targetUser.department,
        position: targetUser.position,
        tenant_id: targetUser.tenant_id,
        organization_id: targetUser.organization_id,
        organization_name: targetUser.organization_name,
      },
    })
    setSessionCookie(response, token)
    return response
  } catch (e) {
    console.error('POST super-admin impersonate', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await insertPlatformAuditLog({
      superAdminId: user.id,
      action: 'support_impersonation_end',
      details: {
        super_admin_email: user.email,
        action: 'impersonation_stopped',
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE super-admin impersonate', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
