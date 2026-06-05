// Simple authentication utility for demo purposes
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'manager' | 'team_lead' | 'project_manager' | 'employee' | 'super_admin'
  employeeId?: string
  first_name?: string
  last_name?: string
  organization_id?: string
  organization_name?: string
  tenant_id?: string
  isImpersonating?: boolean
  originalUser?: { id: string; email: string; role: string; first_name?: string; last_name?: string }
}

function normalizeUnifiedRole(
  role: string
): 'admin' | 'manager' | 'team_lead' | 'project_manager' | 'employee' | 'super_admin' {
  switch (role) {
    case 'super_admin':
      return 'super_admin'
    case 'admin':
      return 'admin'
    case 'manager':
      return 'manager'
    case 'team_lead':
      return 'team_lead'
    case 'project_manager':
      return 'project_manager'
    default:
      return 'employee'
  }
}

export class AuthService {
  private static readonly ADMIN_KEY = 'adminUser'
  private static readonly EMPLOYEE_KEY = 'employeeId'
  private static readonly SESSION_KEY = 'authSession'
  private static readonly IMPERSONATION_KEY = 'impersonationSession'

  static async unifiedLogin(email: string, password: string): Promise<AuthUser | null> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()

      if (data.success && data.employee) {
        const e = data.employee
        const normalizedRole = normalizeUnifiedRole(e.role || 'employee')
        const user: AuthUser = {
          id: e.id,
          email: e.email,
          role: normalizedRole,
          employeeId: e.employee_id ?? undefined,
          first_name: e.first_name,
          last_name: e.last_name,
          organization_id: e.organization_id ?? undefined,
          organization_name: e.organization_name ?? undefined,
          tenant_id: e.tenant_id ?? undefined,
        }

        if (typeof window !== 'undefined') {
          if (e.employee_id) {
            localStorage.setItem(this.EMPLOYEE_KEY, e.employee_id)
          } else {
            localStorage.removeItem(this.EMPLOYEE_KEY)
          }
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
        }

        return user
      }
      return null
    } catch (error) {
      console.error('Unified login error:', error)
      throw error
    }
  }

  static async startImpersonation(targetUserId: string, targetUserData: any): Promise<AuthUser> {
    const currentUser = this.getCurrentUser()
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      throw new Error('Only tenant admins or platform super admins can impersonate users')
    }

    const impersonatedUser: AuthUser = {
      id: targetUserData.id,
      email: targetUserData.email,
      role: targetUserData.role,
      employeeId: targetUserData.employee_id,
      first_name: targetUserData.first_name,
      last_name: targetUserData.last_name,
      tenant_id: targetUserData.tenant_id ?? currentUser.tenant_id,
      organization_id: targetUserData.organization_id ?? currentUser.organization_id,
      organization_name: targetUserData.organization_name ?? currentUser.organization_name,
      isImpersonating: true,
      originalUser: {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
      },
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.IMPERSONATION_KEY, JSON.stringify(impersonatedUser))
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(impersonatedUser))
    }

    return impersonatedUser
  }

  static async stopImpersonation(): Promise<AuthUser | null> {
    if (typeof window === 'undefined') return null

    const impersonationSession = localStorage.getItem(this.IMPERSONATION_KEY)
    if (!impersonationSession) {
      throw new Error('No active impersonation session')
    }

    try {
      const impersonatedUser = JSON.parse(impersonationSession)
      const originalUser = impersonatedUser.originalUser

      if (!originalUser) {
        throw new Error('No original user data found')
      }

      const url =
        originalUser.role === 'super_admin' ? '/api/super-admin/impersonate' : '/api/admin/impersonation'
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${originalUser.id}`,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.warn('Stop impersonation API:', data)
      }

      const restoredUser: AuthUser = {
        id: originalUser.id,
        email: originalUser.email,
        role: originalUser.role as AuthUser['role'],
        first_name: originalUser.first_name,
        last_name: originalUser.last_name,
      }

      localStorage.removeItem(this.IMPERSONATION_KEY)
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(restoredUser))

      return restoredUser
    } catch (error) {
      console.error('Error stopping impersonation:', error)
      return null
    }
  }

  static isImpersonating(): boolean {
    if (typeof window === 'undefined') return false

    const impersonationSession = localStorage.getItem(this.IMPERSONATION_KEY)
    return !!impersonationSession
  }

  static getOriginalUser(): AuthUser['originalUser'] | null {
    if (typeof window === 'undefined') return null

    const impersonationSession = localStorage.getItem(this.IMPERSONATION_KEY)
    if (!impersonationSession) return null

    try {
      const impersonatedUser = JSON.parse(impersonationSession)
      return impersonatedUser.originalUser ?? null
    } catch {
      return null
    }
  }

  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null

    const impersonationSession = localStorage.getItem(this.IMPERSONATION_KEY)
    if (impersonationSession) {
      try {
        return JSON.parse(impersonationSession)
      } catch {
        localStorage.removeItem(this.IMPERSONATION_KEY)
      }
    }

    const session = localStorage.getItem(this.SESSION_KEY)
    if (session) {
      try {
        return JSON.parse(session)
      } catch {
        return null
      }
    }
    return null
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  static isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'admin'
  }

  static isSuperAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'super_admin'
  }

  static isEmployee(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'employee'
  }

  static isTeamLead(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'team_lead'
  }

  static isProjectManager(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'project_manager'
  }

  static isManager(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'manager'
  }

  static logout(): void {
    if (typeof window === 'undefined') return
    const clearAndRedirect = () => {
      localStorage.removeItem(this.ADMIN_KEY)
      localStorage.removeItem(this.EMPLOYEE_KEY)
      localStorage.removeItem(this.SESSION_KEY)
      localStorage.removeItem(this.IMPERSONATION_KEY)
      window.location.href = '/login'
    }
    // Clear the httpOnly session cookie server-side, then clear local UI state.
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(() => {})
      .finally(clearAndRedirect)
  }
}
