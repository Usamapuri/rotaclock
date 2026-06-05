import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * Guards the Phase 2 invariant: every API route authenticates. A route either
 * uses the shared auth middleware/wrappers (createApiAuthMiddleware / withAuth /
 * withTenant) or verifies the session directly (getSession). The only exceptions
 * are the deliberately public endpoints below.
 *
 * The global middleware (middleware.ts) is an additional chokepoint, but this
 * test ensures defense-in-depth at the handler level too, so a future route
 * can't silently ship without auth.
 */
const API_DIR = join(process.cwd(), 'app', 'api')

const PUBLIC_ROUTES = new Set([
  'auth/login',
  'auth/logout',
  'health',
  'organizations/signup',
  'organizations/verify',
])

const AUTH_PATTERN = /createApiAuthMiddleware|withAuth|withTenant|getSession/

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry === 'route.ts') out.push(full)
  }
  return out
}

describe('API route auth coverage', () => {
  const routeFiles = walk(API_DIR)

  it('discovers the route files', () => {
    expect(routeFiles.length).toBeGreaterThan(100)
  })

  for (const file of routeFiles) {
    const routeKey = relative(API_DIR, file).replace(/\\/g, '/').replace(/\/route\.ts$/, '')
    if (PUBLIC_ROUTES.has(routeKey)) continue
    it(`authenticates: ${routeKey}`, () => {
      const src = readFileSync(file, 'utf8')
      expect(AUTH_PATTERN.test(src)).toBe(true)
    })
  }
})
