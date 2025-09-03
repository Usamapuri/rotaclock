import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Create mock functions directly
const mockCreateApiAuthMiddleware = jest.fn()
const mockIsTeamLead = jest.fn()

// Mock the auth module
jest.mock('@/lib/api-auth', () => ({
  createApiAuthMiddleware: mockCreateApiAuthMiddleware,
  isTeamLead: mockIsTeamLead
}))

describe('Debug Mock Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should be able to mock createApiAuthMiddleware', () => {
    expect(mockCreateApiAuthMiddleware).toBeDefined()
    expect(typeof mockCreateApiAuthMiddleware.mockImplementation).toBe('function')
    
    mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({
      user: { id: 'test', role: 'team_lead' },
      isAuthenticated: true
    }))
    
    expect(mockCreateApiAuthMiddleware).toHaveBeenCalledTimes(0)
  })

  it('should be able to mock isTeamLead', () => {
    expect(mockIsTeamLead).toBeDefined()
    expect(typeof mockIsTeamLead.mockReturnValue).toBe('function')
    
    mockIsTeamLead.mockReturnValue(true)
    
    const result = mockIsTeamLead({ id: 'test', role: 'team_lead' } as any)
    expect(result).toBe(true)
  })
})
