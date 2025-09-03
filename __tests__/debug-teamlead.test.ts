import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockQuery = jest.fn()
const mockGetTeamByLead = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockIsTeamLead = jest.fn()

// Mock modules
jest.mock('@/lib/database', () => ({
  query: mockQuery,
  getTeamByLead: mockGetTeamByLead
}))

jest.mock('@/lib/api-auth', () => ({
  createApiAuthMiddleware: mockCreateApiAuthMiddleware,
  isTeamLead: mockIsTeamLead
}))

// Import the API route
import { GET } from '@/app/api/team-lead/leave-requests/route'

describe('Debug Team Lead Auth', () => {
  const mockTeamLead = {
    id: 'tl-123',
    role: 'team_lead',
    email: 'tl@example.com'
  }

  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    department: 'Support'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup auth mock
    mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({
      user: mockTeamLead,
      isAuthenticated: true
    }))
    
    // Setup isTeamLead mock
    mockIsTeamLead.mockReturnValue(true)
    mockGetTeamByLead.mockResolvedValue(mockTeam)
    
    // Setup query mock
    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'leave-123',
          employee_id: 'emp-1',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          status: 'pending'
        }
      ]
    })
  })

  it('should debug the auth flow', async () => {
    const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests')
    const response = await GET(request)
    const data = await response.json()
    
    console.log('Response status:', response.status)
    console.log('Response data:', data)
    console.log('mockIsTeamLead calls:', mockIsTeamLead.mock.calls)
    console.log('mockCreateApiAuthMiddleware calls:', mockCreateApiAuthMiddleware.mock.calls)
    
    // Check if mocks were called
    expect(mockCreateApiAuthMiddleware).toHaveBeenCalled()
    
    // This will help us see what's happening
    if (response.status === 403) {
      console.log('Got 403, error message:', data.error)
    }
  })
})
