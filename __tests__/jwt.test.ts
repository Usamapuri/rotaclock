import { signJwt, verifyJwt } from '@/lib/jwt'

// JWT_SECRET is set in __tests__/setup.ts.
describe('lib/jwt (HS256 via Web Crypto)', () => {
  it('signs and verifies a token round-trip', async () => {
    const token = await signJwt({ sub: 'user-1', role: 'admin', email: 'a@b.com' }, 3600)
    const payload = await verifyJwt(token)
    expect(payload).not.toBeNull()
    expect(payload!.sub).toBe('user-1')
    expect(payload!.role).toBe('admin')
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  it('rejects a tampered token', async () => {
    const token = await signJwt({ sub: 'user-1', role: 'admin' }, 3600)
    const parts = token.split('.')
    // Flip a character in the payload segment.
    const badPayload = parts[1].slice(0, -1) + (parts[1].endsWith('A') ? 'B' : 'A')
    const tampered = `${parts[0]}.${badPayload}.${parts[2]}`
    expect(await verifyJwt(tampered)).toBeNull()
  })

  it('rejects an expired token', async () => {
    const token = await signJwt({ sub: 'user-1', role: 'admin' }, -1) // already expired
    expect(await verifyJwt(token)).toBeNull()
  })

  it('rejects a malformed token', async () => {
    expect(await verifyJwt('not-a-jwt')).toBeNull()
    expect(await verifyJwt('a.b')).toBeNull()
  })
})
