import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { createSessionToken, setSessionCookie } from '@/lib/session'
import { rateLimiters, getRateLimitToken } from '@/lib/rate-limit'

/**
 * POST /api/auth/login — the single login endpoint for all roles.
 *
 * Verifies the password with bcrypt and issues a signed, expiring session
 * cookie. There is no DEMO_AUTH backdoor and no default-password bypass: an
 * account with no password hash simply cannot sign in.
 */
export async function POST(request: NextRequest) {
  try {
    const rl = rateLimiters.auth.check(getRateLimitToken(request), 10)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again shortly.' },
        { status: 429 }
      )
    }

    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const emailLower = String(email).trim().toLowerCase()

    // 1) Tenant users (employees). The same email can exist in multiple orgs;
    // accept the first active org whose password matches.
    const res = await query(
      `SELECT e.id, e.email, e.employee_code, e.first_name, e.last_name, e.department,
              e.job_position, e.role, e.team_id, e.password_hash, e.tenant_id, e.organization_id,
              o.name AS organization_name, o.is_active AS org_is_active
       FROM employees e
       LEFT JOIN organizations o ON e.organization_id = o.id
       WHERE LOWER(TRIM(e.email)) = $1 AND e.is_active = true`,
      [emailLower]
    )

    let employee: Record<string, any> | null = null
    for (const r of res.rows as Record<string, any>[]) {
      if (r.organization_id != null && r.org_is_active === false) continue
      if (!r.password_hash) continue
      try {
        if (await bcrypt.compare(password, String(r.password_hash))) {
          employee = r
          break
        }
      } catch {
        /* malformed hash — try next row */
      }
    }

    if (employee) {
      const role = (employee.role as string) || 'employee'
      const token = await createSessionToken({ id: employee.id, role, email: employee.email })
      const response = NextResponse.json({
        success: true,
        employee: {
          id: employee.id,
          employee_id: employee.employee_code,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          department: employee.department,
          position: employee.job_position,
          role,
          team_id: employee.team_id || null,
          tenant_id: employee.tenant_id || null,
          organization_id: employee.organization_id || null,
          organization_name: employee.organization_name ?? null,
        },
      })
      setSessionCookie(response, token)
      return response
    }

    // 2) Platform super admins
    try {
      const sa = await query(
        `SELECT id, email, full_name, password_hash FROM super_admins
         WHERE LOWER(TRIM(email)) = $1 AND is_active = true`,
        [emailLower]
      )
      if (sa.rows.length > 0) {
        const row = sa.rows[0] as {
          id: string
          email: string
          full_name: string | null
          password_hash: string
        }
        if (row.password_hash && (await bcrypt.compare(password, row.password_hash))) {
          const parts = (row.full_name || 'Platform Admin').split(/\s+/)
          const token = await createSessionToken({ id: row.id, role: 'super_admin', email: row.email })
          const response = NextResponse.json({
            success: true,
            employee: {
              id: row.id,
              employee_id: null,
              first_name: parts[0] || 'Platform',
              last_name: parts.slice(1).join(' ') || 'Admin',
              email: row.email,
              department: 'Platform',
              position: 'Super Administrator',
              role: 'super_admin',
              team_id: null,
              tenant_id: null,
              organization_id: null,
              organization_name: null,
            },
          })
          setSessionCookie(response, token)
          return response
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Super admin login unavailable (table missing?)', e)
      }
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
