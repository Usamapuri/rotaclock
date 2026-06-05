import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

/**
 * Endpoints reachable without a session. Everything else under /api requires a
 * valid signed session — this is the single chokepoint that guarantees no API
 * route is reachable unauthenticated, including routes that don't (yet) call
 * the auth middleware themselves.
 */
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/organizations/signup',
  '/api/organizations/verify',
  '/api/health',
]

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Retired role areas (team-lead / project-manager) are gone.
  if (
    pathname.startsWith('/team-lead') ||
    pathname.startsWith('/project-manager') ||
    pathname.startsWith('/api/team-lead') ||
    pathname.startsWith('/api/project-manager')
  ) {
    return new NextResponse('Gone', { status: 410 })
  }

  // Only guard API routes. Page routes render client-side and redirect to
  // /login themselves when there is no session (hardening pages is Phase 6).
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (isPublicApi(pathname)) {
    return NextResponse.next()
  }

  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Coarse role gates by path prefix (defense-in-depth; handlers still do their
  // own fine-grained tenant/role checks). Higher roles may reach lower-scoped
  // admin/manager areas; employees cannot reach admin/manager/super-admin.
  const role = String(session.role || '')
  const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (pathname.startsWith('/api/super-admin')) {
    if (role !== 'super_admin') return forbidden()
  } else if (pathname.startsWith('/api/admin')) {
    if (role !== 'admin' && role !== 'super_admin') return forbidden()
  } else if (pathname.startsWith('/api/manager')) {
    if (role !== 'manager' && role !== 'admin' && role !== 'super_admin') return forbidden()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
