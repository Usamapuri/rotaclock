import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const emailLower = String(email).trim().toLowerCase()

    let employee: Record<string, unknown> | null = null
    try {
      const res = await query(
        `
        SELECT e.id, e.email, e.employee_code, e.first_name, e.last_name, e.department, e.job_position, e.role, e.team_id, e.password_hash, e.tenant_id, e.organization_id,
               o.name AS organization_name, o.is_active AS org_is_active
        FROM employees e
        LEFT JOIN organizations o ON e.organization_id = o.id
        WHERE LOWER(e.email) = LOWER($1) AND e.is_active = true
      `,
        [emailLower]
      )

      if (res.rows.length > 0) {
        employee = res.rows[0] as Record<string, unknown>
        const orgActive = employee.org_is_active
        if (employee.organization_id != null && orgActive === false) {
          return NextResponse.json(
            { error: 'This organization has been suspended. Contact support.' },
            { status: 403 }
          )
        }
      }
    } catch (dbErr) {
      console.error('Unified login DB error:', dbErr)
    }

    const demoEnabled = (process.env.DEMO_AUTH ?? '').toLowerCase() === 'true'
    if (!employee && demoEnabled) {
      const lower = String(email || '').toLowerCase()
      const role = lower.includes('admin')
        ? 'admin'
        : lower.includes('team') || lower.includes('lead')
          ? 'team_lead'
          : 'employee'
      employee = {
        id: 'demo-' + role,
        email,
        employee_code: 'EMPDEMO',
        first_name: 'Demo',
        last_name: role.charAt(0).toUpperCase() + role.slice(1),
        department: 'General',
        job_position: role === 'admin' ? 'Administrator' : role.replace('_', ' '),
        role,
        team_id: null,
        tenant_id: 'demo-tenant',
        organization_id: null,
        organization_name: null,
        org_is_active: true,
      }
    }

    if (!employee) {
      try {
        const sa = await query(
          `SELECT id, email, full_name, password_hash FROM super_admins WHERE LOWER(email) = LOWER($1) AND is_active = true`,
          [emailLower]
        )
        if (sa.rows.length > 0) {
          const superRow = sa.rows[0] as {
            id: string
            email: string
            full_name: string | null
            password_hash: string
          }
          const ok = await bcrypt.compare(password, superRow.password_hash)
          if (!ok) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
          }
          const nameParts = (superRow.full_name || 'Platform Admin').split(/\s+/)
          const first_name = nameParts[0] || 'Platform'
          const last_name = nameParts.slice(1).join(' ') || 'Admin'
          return NextResponse.json({
            success: true,
            employee: {
              id: superRow.id,
              employee_id: null,
              first_name,
              last_name,
              email: superRow.email,
              department: 'Platform',
              position: 'Super Administrator',
              role: 'super_admin',
              team_id: null,
              tenant_id: null,
              organization_id: null,
              organization_name: null,
            },
          })
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Super admin login unavailable (table missing?)', e)
        }
      }
    }

    if (!employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    let passwordOk = false
    if (employee.password_hash) {
      try {
        passwordOk = await bcrypt.compare(password, String(employee.password_hash))
      } catch (_) {
        passwordOk = false
      }
    } else {
      const allowDefault = (process.env.ALLOW_DEFAULT_PASSWORD ?? 'true').toLowerCase() === 'true'
      if (allowDefault) passwordOk = password === 'password123'
    }

    if (!passwordOk) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        employee_id: employee.employee_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department: employee.department,
        position: employee.job_position,
        role: employee.role || 'employee',
        team_id: employee.team_id || null,
        tenant_id: employee.tenant_id || null,
        organization_id: employee.organization_id || null,
        organization_name: employee.organization_name ?? null,
      },
    })
  } catch (error) {
    console.error('Unified login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
