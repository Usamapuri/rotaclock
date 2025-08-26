import { AuthService } from '@/lib/auth'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('AuthService Impersonation', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  describe('startImpersonation', () => {
    it('should start impersonation for admin user', async () => {
      // Mock current user as admin
      const mockAdminUser = {
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockAdminUser))
      
      const targetUserData = {
        id: 'target-id',
        email: 'target@test.com',
        role: 'employee',
        employee_id: 'EMP001'
      }

      const result = await AuthService.startImpersonation('target-id', targetUserData)

      expect(result).toEqual({
        id: 'target-id',
        email: 'target@test.com',
        role: 'employee',
        employeeId: 'EMP001',
        isImpersonating: true,
        originalUser: {
          id: 'admin-id',
          email: 'admin@test.com',
          role: 'admin'
        }
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'impersonationSession',
        JSON.stringify(result)
      )
    })

    it('should throw error if user is not admin', async () => {
      // Mock current user as employee
      const mockEmployeeUser = {
        id: 'employee-id',
        email: 'employee@test.com',
        role: 'employee'
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockEmployeeUser))
      
      const targetUserData = {
        id: 'target-id',
        email: 'target@test.com',
        role: 'employee'
      }

      await expect(AuthService.startImpersonation('target-id', targetUserData))
        .rejects.toThrow('Only admins can impersonate users')
    })
  })

  describe('stopImpersonation', () => {
    it('should stop impersonation and restore original user', async () => {
      const mockImpersonatedUser = {
        id: 'target-id',
        email: 'target@test.com',
        role: 'employee',
        isImpersonating: true,
        originalUser: {
          id: 'admin-id',
          email: 'admin@test.com',
          role: 'admin'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockImpersonatedUser))

      const result = await AuthService.stopImpersonation()

      expect(result).toEqual({
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin'
      })

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('impersonationSession')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'authSession',
        JSON.stringify(result)
      )
    })

    it('should throw error if no impersonation session exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await expect(AuthService.stopImpersonation())
        .rejects.toThrow('No active impersonation session')
    })
  })

  describe('isImpersonating', () => {
    it('should return true when impersonation session exists', () => {
      localStorageMock.getItem.mockReturnValue('{"isImpersonating": true}')

      const result = AuthService.isImpersonating()

      expect(result).toBe(true)
    })

    it('should return false when no impersonation session exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = AuthService.isImpersonating()

      expect(result).toBe(false)
    })
  })

  describe('getOriginalUser', () => {
    it('should return original user data when impersonating', () => {
      const mockImpersonatedUser = {
        isImpersonating: true,
        originalUser: {
          id: 'admin-id',
          email: 'admin@test.com',
          role: 'admin'
        }
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockImpersonatedUser))

      const result = AuthService.getOriginalUser()

      expect(result).toEqual({
        id: 'admin-id',
        email: 'admin@test.com',
        role: 'admin'
      })
    })

    it('should return null when not impersonating', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = AuthService.getOriginalUser()

      expect(result).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    beforeEach(() => {
      // Reset the mock before each test
      localStorageMock.getItem.mockReset()
    })

    it('should return impersonated user when impersonation session exists', () => {
      const mockImpersonatedUser = {
        id: 'target-id',
        email: 'target@test.com',
        role: 'employee',
        isImpersonating: true
      }
      
      // Mock the localStorage.getItem calls in the order they happen in getCurrentUser
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockImpersonatedUser)) // impersonation session
        .mockReturnValueOnce(null) // regular session (won't be called since impersonation exists)

      const result = AuthService.getCurrentUser()

      expect(result).toEqual(mockImpersonatedUser)
    })

    it('should return regular user when no impersonation session exists', () => {
      const mockRegularUser = {
        id: 'user-id',
        email: 'user@test.com',
        role: 'employee'
      }
      
      // Mock the localStorage.getItem calls in the order they happen in getCurrentUser
      localStorageMock.getItem
        .mockReturnValueOnce(null) // impersonation session
        .mockReturnValueOnce(JSON.stringify(mockRegularUser)) // regular session

      const result = AuthService.getCurrentUser()

      expect(result).toEqual(mockRegularUser)
    })

    it('should return null when no session exists', () => {
      // Mock the localStorage.getItem calls in the order they happen in getCurrentUser
      localStorageMock.getItem
        .mockReturnValueOnce(null) // impersonation session
        .mockReturnValueOnce(null) // regular session

      const result = AuthService.getCurrentUser()

      expect(result).toBeNull()
    })
  })
})
