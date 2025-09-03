import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const authMiddleware = createApiAuthMiddleware()

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can impersonate users' }, { status: 403 })
    }

    const tenant = await getTenantContext(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { targetUserId } = await request.json()
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Fetch target user data within same tenant
    const targetUserQuery = `
      SELECT id, employee_code as employee_id, email, first_name, last_name, role, department, job_position as position, is_active
      FROM employees_new 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `
    const targetUserResult = await query(targetUserQuery, [targetUserId, tenant.tenant_id])
    
    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target user not found in tenant or inactive' }, { status: 404 })
    }

    const targetUser = targetUserResult.rows[0]

    // Log impersonation action in audit table
    const auditQuery = `
      INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details, tenant_id, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
    `
    await query(auditQuery, [
      user.id,
      'impersonation_start',
      targetUserId,
      JSON.stringify({
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
        admin_email: user.email,
      }),
      tenant.tenant_id,
    ])

    return NextResponse.json({
      success: true,
      targetUser: {
        id: targetUser.id,
        employee_id: targetUser.employee_id,
        email: targetUser.email,
        first_name: targetUser.first_name,
        last_name: targetUser.last_name,
        role: targetUser.role,
        department: targetUser.department,
        position: targetUser.position
      }
    })

  } catch (error) {
    console.error('Impersonation start error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can stop impersonation' }, { status: 403 })
    }

    const tenant = await getTenantContext(user.id)

    // Log impersonation end action
    const auditQuery = `
      INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details, tenant_id, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
    `
    await query(auditQuery, [
      user.id,
      'impersonation_end',
      null,
      JSON.stringify({
        admin_email: user.email,
        action: 'impersonation_stopped'
      }),
      tenant?.tenant_id || null,
    ])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Impersonation stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
