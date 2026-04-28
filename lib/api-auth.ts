import { NextRequest } from 'next/server'
import { query } from '@/lib/database'

export type ApiUser = {
  id: string
  email?: string
  role: 'admin' | 'manager' | 'employee' | 'team_lead' | 'project_manager' | 'super_admin'
  employeeId?: string
  isSuperAdmin?: boolean
  isImpersonating?: boolean
  originalUser?: { id: string; email: string; role: string }
}

export function createApiAuthMiddleware() {
  return async (request: NextRequest) => {
    const authHeader = request.headers.get('authorization')
    const employeeHeader = request.headers.get('x-employee-id')

    let token: string | null = null
    if (authHeader?.toLowerCase().startsWith('bearer ')) {
      token = authHeader.split(' ')[1]?.trim() || null
    } else if (employeeHeader) {
      token = employeeHeader.trim()
    }

    let user: ApiUser | null = null
    if (token) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
      if (isUuid) {
        const empRes = await query(
          'SELECT id, employee_code, email, role FROM employees WHERE id = $1 AND is_active = true',
          [token]
        )
        if (empRes.rows.length > 0) {
          const e = empRes.rows[0]
          const role = (e.role as string) || 'employee'
          user = { id: e.id, email: e.email, role: role as ApiUser['role'], employeeId: e.employee_code }
        } else {
          const saRes = await query(
            'SELECT id, email FROM super_admins WHERE id = $1 AND is_active = true',
            [token]
          )
          if (saRes.rows.length > 0) {
            const s = saRes.rows[0]
            user = {
              id: s.id,
              email: s.email,
              role: 'super_admin',
              isSuperAdmin: true,
            }
          }
        }
      } else {
        const res = await query(
          'SELECT id, employee_code, email, role FROM employees WHERE employee_code = $1 AND is_active = true',
          [token]
        )
        if (res.rows.length > 0) {
          const e = res.rows[0]
          const role = (e.role as string) || 'employee'
          user = { id: e.id, email: e.email, role: role as ApiUser['role'], employeeId: e.employee_code }
        }
      }
    }

    const allowDemo = (process.env.DEMO_AUTH ?? '').toLowerCase() === 'true'
    if (!user && allowDemo) {
      user = {
        id: 'c67f737f-662a-4530-8d07-ba13d56bc54b',
        email: 'admin@rotaclock.com',
        role: 'admin',
        employeeId: 'EMP001',
      }
    }

    const isAuthenticated = !!user
    return { user, isAuthenticated }
  }
}

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
