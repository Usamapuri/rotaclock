import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isSuperAdmin } from '@/lib/api-auth'
import { insertPlatformAuditLog } from '@/lib/platform-audit'

const authMiddleware = createApiAuthMiddleware()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user || !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: requestId } = await params
    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 2000) : null

    const res = await query(
      `UPDATE tenant_signup_requests SET
        status = 'rejected',
        reviewed_by_super_admin_id = $1,
        reviewed_at = NOW(),
        rejection_reason = $2,
        updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING id, payload`,
      [user.id, reason, requestId]
    )

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found or not pending' }, { status: 400 })
    }

    await insertPlatformAuditLog({
      superAdminId: user.id,
      action: 'request_rejected',
      details: {
        request_id: requestId,
        reason,
        admin_email: user.email,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST reject request', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
