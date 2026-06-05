/**
 * Minimal, dependency-free JWT (HS256) using the Web Crypto API.
 *
 * Web Crypto (`crypto.subtle`) is available in both the Node.js runtime used by
 * route handlers AND the Edge runtime used by `middleware.ts`, so a single
 * implementation works everywhere. We only use a standard HMAC-SHA256 over the
 * `header.payload` — we are NOT inventing a crypto primitive.
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

function base64urlFromBytes(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlFromString(s: string): string {
  return base64urlFromBytes(enc.encode(s))
}

function bytesFromBase64url(s: string): Uint8Array {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4
  if (pad) b64 += '='.repeat(4 - pad)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function stringFromBase64url(s: string): string {
  return dec.decode(bytesFromBase64url(s))
}

/**
 * Resolve the signing secret. A strong JWT_SECRET is REQUIRED in production;
 * if it is missing there we refuse (fail closed). In development we fall back
 * to a fixed, clearly-insecure value so the app runs out of the box — this is
 * never used in production.
 */
function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV !== 'production') {
    return 'dev-insecure-jwt-secret-change-me-rotaclock'
  }
  throw new Error('JWT_SECRET must be set to a strong (>=16 char) value in production')
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export interface JwtPayload {
  /** subject — the authenticated user's id (employee.id or super_admin.id) */
  sub: string
  role: string
  email?: string
  /** original user, present only while impersonating */
  imp?: { id: string; role: string; email?: string }
  iat: number
  exp: number
  [key: string]: unknown
}

export async function signJwt(
  claims: Omit<JwtPayload, 'iat' | 'exp'>,
  ttlSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: JwtPayload = { ...claims, iat: now, exp: now + ttlSeconds }
  const headerPart = base64urlFromString(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadPart = base64urlFromString(JSON.stringify(payload))
  const data = `${headerPart}.${payloadPart}`
  const key = await importKey()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return `${data}.${base64urlFromBytes(new Uint8Array(sig))}`
}

/** Verify signature + expiry. Returns the payload, or null if invalid/expired. */
export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerPart, payloadPart, sigPart] = parts
    const data = `${headerPart}.${payloadPart}`
    const key = await importKey()
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      bytesFromBase64url(sigPart),
      enc.encode(data)
    )
    if (!valid) return null
    const payload = JSON.parse(stringFromBase64url(payloadPart)) as JwtPayload
    if (typeof payload.exp !== 'number') return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
