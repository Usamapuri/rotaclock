import { NextRequest, NextResponse } from 'next/server'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { query } from '@/lib/database'

/**
 * GET /api/auth/me — the current user from the (httpOnly cookie) session.
 * The single source of truth for the frontend AuthProvider, replacing scattered
 * localStorage reads. Returns 401 if there is no valid session.
 */
async function _GET(request: NextRequest) {
  const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
  if (!isAuthenticated || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenantContext(user.id)

  let firstName: string | null = null
  let lastName: string | null = null
  try {
    const r = await query('SELECT first_name, last_name FROM employees WHERE id = $1', [user.id])
    if (r.rows[0]) {
      firstName = r.rows[0].first_name
      lastName = r.rows[0].last_name
    }
  } catch {
    /* super_admins aren't in employees; names stay null */
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email ?? null,
      role: user.role,
      employeeId: user.employeeId ?? null,
      first_name: firstName,
      last_name: lastName,
      isSuperAdmin: !!user.isSuperAdmin,
      isImpersonating: !!user.isImpersonating,
      originalUser: user.originalUser ?? null,
      tenant_id: tenant?.tenant_id ?? null,
      organization_id: tenant?.organization_id ?? null,
      organization_name: tenant?.organization_name ?? null,
    },
  })
}

export const GET = withRlsTenant(_GET)
