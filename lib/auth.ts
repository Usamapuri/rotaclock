// Simple authentication utility for demo purposes
export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'employee'
  employeeId?: string
}

export class AuthService {
  private static readonly ADMIN_KEY = 'adminUser'
  private static readonly EMPLOYEE_KEY = 'employeeId'
  private static readonly SESSION_KEY = 'authSession'

  static async adminLogin(username: string, password: string): Promise<AuthUser | null> {
    try {
      // For demo purposes, allow admin login with any valid credentials
      // In production, this should validate against the database
      if (username && password) {
        const user: AuthUser = {
          id: '90b8785f-242d-4513-928b-40296efee618', // Usama Puri (CTO) - valid UUID
          email: 'usamapuri@gmail.com',
          role: 'admin'
        }
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.ADMIN_KEY, username)
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
        }
        
        return user
      }
      return null
    } catch (error) {
      console.error('Admin login error:', error)
      return null
    }
  }

  static async employeeLogin(employeeId: string, password: string): Promise<AuthUser | null> {
    try {
      const response = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Login failed')
      }

      const data = await response.json()
      
      if (data.success && data.employee) {
        const user: AuthUser = {
          id: data.employee.id,
          email: data.employee.email,
          role: 'employee',
          employeeId: data.employee.employee_id
        }
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.EMPLOYEE_KEY, employeeId)
          localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
        }
        
        return user
      }
      return null
    } catch (error) {
      console.error('Employee login error:', error)
      return null
    }
  }

  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    
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

  static isEmployee(): boolean {
    const user = this.getCurrentUser()
    return user?.role === 'employee'
  }

  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.ADMIN_KEY)
      localStorage.removeItem(this.EMPLOYEE_KEY)
      localStorage.removeItem(this.SESSION_KEY)
    }
  }
} 