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

  // Mock admin credentials for demo
  private static readonly ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  }

  // Mock employee credentials for demo
  private static readonly EMPLOYEE_CREDENTIALS = {
    employeeId: 'EMP001',
    password: 'emp123'
  }

  static async adminLogin(username: string, password: string): Promise<AuthUser | null> {
    if (username === this.ADMIN_CREDENTIALS.username && password === this.ADMIN_CREDENTIALS.password) {
      const user: AuthUser = {
        id: 'admin-1',
        email: 'admin@company.com',
        role: 'admin'
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.ADMIN_KEY, username)
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
      }
      
      return user
    }
    return null
  }

  static async employeeLogin(employeeId: string, password: string): Promise<AuthUser | null> {
    if (employeeId === this.EMPLOYEE_CREDENTIALS.employeeId && password === this.EMPLOYEE_CREDENTIALS.password) {
      const user: AuthUser = {
        id: 'emp-1',
        email: 'john.doe@company.com',
        role: 'employee',
        employeeId: employeeId
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.EMPLOYEE_KEY, employeeId)
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
      }
      
      return user
    }
    return null
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