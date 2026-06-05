import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { getSession } from '@/lib/session'
import type { JwtPayload } from '@/lib/jwt'
import { getTenantContext, type TenantContext } from '@/lib/tenant-middleware'

export type ApiRole = 'admin' | 'manager' | 'employee' | 'team_lead' | 'project_manager' | 'super_admin'

export type ApiUser = {
  id: string
  email?: string
  role: ApiRole
  employeeId?: string
  isSuperAdmin?: boolean
  isImpersonating?: boolean
  originalUser?: { id: string; email: string; role: string }
}

/**
 * Load the authenticated user from the database by their (verified) id. We
 * deliberately re-read role + active status from the DB on every request so a
 * deactivated account or a role change takes effect immediately, rather than
 * trusting stale token claims.
 */
async function loadApiUser(userId: string): Promise<ApiUser | null> {
  const empRes = await query(
    'SELECT id, employee_code, email, role FROM employees WHERE id = $1 AND is_active = true',
    [userId]
  )
  if (empRes.rows.length > 0) {
    const e = empRes.rows[0]
    return {
      id: e.id,
      email: e.email,
      role: ((e.role as string) || 'employee') as ApiRole,
      employeeId: e.employee_code,
    }
  }

  const saRes = await query(
    'SELECT id, email FROM super_admins WHERE id = $1 AND is_active = true',
    [userId]
  )
  if (saRes.rows.length > 0) {
    const s = saRes.rows[0]
    return { id: s.id, email: s.email, role: 'super_admin', isSuperAdmin: true }
  }

  return null
}

function applyImpersonation(user: ApiUser, session: JwtPayload): ApiUser {
  if (session.imp) {
    user.isImpersonating = true
    user.originalUser = {
      id: session.imp.id,
      email: session.imp.email || '',
      role: session.imp.role,
    }
  }
  return user
}

/**
 * Resolve the authenticated user from a verified signed session (cookie or
 * Bearer JWT). Returns the same `{ user, isAuthenticated }` shape the previous
 * middleware did, so existing route handlers keep working unchanged — but the
 * token is now signed + expiring, not a forgeable raw UUID, and the DEMO_AUTH
 * backdoor is gone.
 */
export function createApiAuthMiddleware() {
  return async (request: NextRequest) => {
    const session = await getSession(request)
    let user: ApiUser | null = null
    if (session?.sub) {
      user = await loadApiUser(session.sub)
      if (user) applyImpersonation(user, session)
    }
    return { user, isAuthenticated: !!user }
  }
}

// ---------------------------------------------------------------------------
// Preferred route wrappers
// ---------------------------------------------------------------------------

type RouteContext = { params?: Promise<Record<string, string>> }

export type AuthContext = { user: ApiUser; session: JwtPayload }
export type TenantAuthContext = AuthContext & { tenant: TenantContext }

type AuthedHandler = (
  request: NextRequest,
  ctx: RouteContext,
  auth: AuthContext
) => Promise<Response> | Response

type TenantHandler = (
  request: NextRequest,
  ctx: RouteContext,
  auth: TenantAuthContext
) => Promise<Response> | Response

function splitArgs<H>(a: ApiRole[] | H, b?: H): { roles: ApiRole[] | null; handler: H } {
  if (typeof a === 'function') return { roles: null, handler: a as H }
  return { roles: a as ApiRole[], handler: b as H }
}

async function authenticate(
  request: NextRequest,
  roles: ApiRole[] | null
): Promise<{ user: ApiUser; session: JwtPayload } | NextResponse> {
  const session = await getSession(request)
  const user = session?.sub ? await loadApiUser(session.sub) : null
  if (!session || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  applyImpersonation(user, session)
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return { user, session }
}

/**
 * Wrap a route handler so it only runs for an authenticated user (optionally
 * restricted to `roles`). The handler receives `(request, ctx, { user, session })`.
 *
 *   export const GET = withAuth(['admin'], async (req, ctx, { user }) => { ... })
 *   export const GET = withAuth(async (req, ctx, { user }) => { ... })
 */
export function withAuth(handler: AuthedHandler): AuthedHandler
export function withAuth(roles: ApiRole[], handler: AuthedHandler): AuthedHandler
export function withAuth(a: ApiRole[] | AuthedHandler, b?: AuthedHandler) {
  const { roles, handler } = splitArgs<AuthedHandler>(a, b)
  return async (request: NextRequest, ctx: RouteContext) => {
    const res = await authenticate(request, roles)
    if (res instanceof NextResponse) return res
    return handler(request, ctx ?? {}, res)
  }
}

/**
 * Like `withAuth`, but also resolves the caller's tenant context and rejects if
 * none exists. The handler receives `(request, ctx, { user, tenant, session })`.
 * Use this for every tenant-scoped route.
 */
export function withTenant(handler: TenantHandler): TenantHandler
export function withTenant(roles: ApiRole[], handler: TenantHandler): TenantHandler
export function withTenant(a: ApiRole[] | TenantHandler, b?: TenantHandler) {
  const { roles, handler } = splitArgs<TenantHandler>(a, b)
  return async (request: NextRequest, ctx: RouteContext) => {
    const res = await authenticate(request, roles)
    if (res instanceof NextResponse) return res
    const tenant = await getTenantContext(res.user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    return handler(request, ctx ?? {}, { ...res, tenant })
  }
}

// ---------------------------------------------------------------------------
// Role helpers (unchanged API)
// ---------------------------------------------------------------------------

export function isSuperAdmin(user: ApiUser | null): boolean {
  return !!user && user.role === 'super_admin'
}

export function isAdmin(user: ApiUser | null): boolean {
  return !!user && user.role === 'admin'
}

export function isTeamLead(user: ApiUser | null): boolean {
  return !!user && user.role === 'team_lead'
}

export function isEmployee(user: ApiUser | null): boolean {
  return !!user && user.role === 'employee'
}

export function isProjectManager(user: ApiUser | null): boolean {
  return !!user && user.role === 'project_manager'
}

export function isManager(user: ApiUser | null): boolean {
  return !!user && user.role === 'manager'
}

export async function getManagerLocations(userId: string, tenantId: string): Promise<string[] | null> {
  const result = await query(
    `
    SELECT l.id
    FROM locations l
    JOIN manager_locations ml ON l.id = ml.location_id
    WHERE ml.tenant_id = $1 AND ml.manager_id = $2 AND l.is_active = true
  `,
    [tenantId, userId]
  )

  return result.rows.length > 0 ? result.rows.map((r) => r.id) : null
}
