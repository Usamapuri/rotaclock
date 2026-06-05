/**
 * Server session helpers — issuing, reading and clearing the signed session
 * cookie that replaces the old raw-UUID bearer token.
 *
 * Transport: an httpOnly, SameSite=Lax cookie (Secure in production). Because
 * the app and its /api routes are same-origin, the browser sends this cookie on
 * every fetch automatically, so existing client code needs no per-request
 * change. A `Authorization: Bearer <jwt>` header is still accepted as a
 * fallback for tests and non-browser API clients.
 */
import { NextResponse } from 'next/server'
import { signJwt, verifyJwt, type JwtPayload } from './jwt'

export const SESSION_COOKIE = 'rotaclock_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 hours

export interface SessionUser {
  id: string
  role: string
  email?: string
  /** set only when issuing an impersonation session */
  imp?: { id: string; role: string; email?: string }
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return signJwt(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      ...(user.imp ? { imp: user.imp } : {}),
    },
    SESSION_TTL_SECONDS
  )
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/** Pull the session token from the cookie (preferred) or Bearer header. */
export function readSessionToken(request: Request): string | null {
  // NextRequest exposes a typed cookie jar; plain Request does not.
  const jar = (request as { cookies?: { get?: (n: string) => { value?: string } | undefined } }).cookies
  const fromJar = jar?.get?.(SESSION_COOKIE)?.value
  if (fromJar) return fromJar

  const rawCookie = request.headers.get('cookie')
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
    if (match) return decodeURIComponent(match[1])
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim() || null
  }
  return null
}

/** Verify the request's session. Returns the JWT payload or null. */
export async function getSession(request: Request): Promise<JwtPayload | null> {
  const token = readSessionToken(request)
  if (!token) return null
  return verifyJwt(token)
}
