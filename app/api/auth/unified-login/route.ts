import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    let employee: any | null = null
    try {
      // Authenticate against canonical employees table
      const res = await query(`
        SELECT id, email, employee_code, first_name, last_name, department, job_position, role, team_id, password_hash, tenant_id, organization_id
        FROM employees
        WHERE email = $1 AND is_active = true
      `, [email])

      if (res.rows.length > 0) {
        employee = res.rows[0]
      }
    } catch (dbErr) {
      console.error('Unified login DB error:', dbErr)
      // continue to demo fallback below
    }

    // Demo fallback only if explicitly enabled
    const demoEnabled = (process.env.DEMO_AUTH ?? '').toLowerCase() === 'true'
    if (!employee && demoEnabled) {
      const lower = String(email || '').toLowerCase()
      const role = lower.includes('admin') ? 'admin' : (lower.includes('team') || lower.includes('lead')) ? 'team_lead' : 'employee'
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
      }
    }

    // If not demo user, require valid password
    if (!employee) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    let passwordOk = false
    if (employee.password_hash) {
      try {
        passwordOk = await bcrypt.compare(password, employee.password_hash)
      } catch (_) {
        passwordOk = false
      }
    } else {
      // Optional fallback only for accounts without a hash
      const allowDefault = (process.env.ALLOW_DEFAULT_PASSWORD ?? 'true').toLowerCase() === 'true'
      if (allowDefault) passwordOk = password === 'password123'
    }

    // If no hash and default not allowed or compare failed, reject
    if (!passwordOk) {
      // If demo is enabled AND this is not a real employee (handled above), demo password already checked
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Return employee data with role-based routing
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
      }
    })

  } catch (error) {
    console.error('Unified login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
