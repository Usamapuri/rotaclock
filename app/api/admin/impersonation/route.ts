import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

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

    const { targetUserId } = await request.json()
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Fetch target user data
    const targetUserQuery = `
      SELECT id, employee_id, email, first_name, last_name, role, department, position, is_active
      FROM employees 
      WHERE id = $1 AND is_active = true
    `
    const targetUserResult = await query(targetUserQuery, [targetUserId])
    
    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ error: 'Target user not found or inactive' }, { status: 404 })
    }

    const targetUser = targetUserResult.rows[0]

    // Log impersonation action in audit table
    const auditQuery = `
      INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
    `
    await query(auditQuery, [
      user.id,
      'impersonation_start',
      targetUserId,
      JSON.stringify({
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
        admin_email: user.email
      })
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

    // Log impersonation end action
    const auditQuery = `
      INSERT INTO admin_audit_logs (id, admin_id, action, target_user_id, details, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
    `
    await query(auditQuery, [
      user.id,
      'impersonation_end',
      null,
      JSON.stringify({
        admin_email: user.email,
        action: 'impersonation_stopped'
      })
    ])

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Impersonation stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
