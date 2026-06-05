import { NextRequest, NextResponse } from 'next/server'
import { getSession, createSessionToken, setSessionCookie } from '@/lib/session'

/**
 * POST /api/auth/stop-impersonation
 *
 * Ends an impersonation session by restoring the original user's session from
 * the `imp` claim carried in the current (impersonating) session cookie. Lives
 * under /api/auth so it is reachable regardless of the impersonated user's role
 * (the admin/super-admin path gates would otherwise block it mid-impersonation).
 */
export async function POST(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.imp) {
    return NextResponse.json({ error: 'Not impersonating' }, { status: 400 })
  }

  const original = session.imp
  const token = await createSessionToken({
    id: original.id,
    role: original.role,
    email: original.email,
  })
  const response = NextResponse.json({ success: true, originalUser: original })
  setSessionCookie(response, token)
  return response
}
