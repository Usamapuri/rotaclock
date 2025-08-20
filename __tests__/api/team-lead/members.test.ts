import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock the database functions
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
  getTeamByLead: jest.fn(),
  addEmployeeToTeam: jest.fn(),
  removeEmployeeFromTeam: jest.fn(),
}))

// Mock the auth middleware
jest.mock('@/lib/api-auth', () => ({
  createApiAuthMiddleware: jest.fn(),
  isTeamLead: jest.fn(),
}))

// Import after mocking
import { POST, DELETE } from '@/app/api/team-lead/teams/[id]/members/route'
import { query, getTeamByLead, addEmployeeToTeam, removeEmployeeFromTeam } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

const mockQuery = query as jest.MockedFunction<typeof query>
const mockGetTeamByLead = getTeamByLead as jest.MockedFunction<typeof getTeamByLead>
const mockAddEmployeeToTeam = addEmployeeToTeam as jest.MockedFunction<typeof addEmployeeToTeam>
const mockRemoveEmployeeFromTeam = removeEmployeeFromTeam as jest.MockedFunction<typeof removeEmployeeFromTeam>
const mockCreateApiAuthMiddleware = createApiAuthMiddleware as jest.MockedFunction<typeof createApiAuthMiddleware>

describe('/api/team-lead/teams/[id]/members', () => {
  const mockTeamLead = {
    id: 'test-tl-id',
    role: 'team_lead',
    email: 'tl@test.com'
  }

  const mockTeam = {
    id: 'test-team-id',
    name: 'Test Team',
    team_lead_id: 'test-tl-id',
    is_active: true
  }

  const mockEmployee = {
    id: 'test-employee-id',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@test.com',
    is_active: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth mock
    mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
      user: mockTeamLead,
      isAuthenticated: true
    }))
  })

  describe('POST - Add Member', () => {
    it('should add member to team successfully', async () => {
      // Setup mocks
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [mockEmployee] })
      mockAddEmployeeToTeam.mockResolvedValue(true)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer test-tl-id'
        },
        body: JSON.stringify({ employee_id: 'test-employee-id' })
      })

      // Execute
      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      // Assertions
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Employee added to team successfully')
      expect(mockGetTeamByLead).toHaveBeenCalledWith('test-tl-id')
      expect(mockAddEmployeeToTeam).toHaveBeenCalledWith('test-team-id', 'test-employee-id')
    })

    it('should reject unauthorized access', async () => {
      // Setup auth mock to return unauthorized
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: null,
        isAuthenticated: false
      }))

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'test-employee-id' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject non-team-lead users', async () => {
      // Setup auth mock to return non-team-lead user
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: { ...mockTeamLead, role: 'employee' },
        isAuthenticated: true
      }))

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: 'test-employee-id' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject adding member to wrong team', async () => {
      // Setup mocks - team lead has different team
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: mockTeamLead,
        isAuthenticated: true
      }))
      mockGetTeamByLead.mockResolvedValue({ ...mockTeam, id: 'different-team-id' })

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer test-tl-id'
        },
        body: JSON.stringify({ employee_id: 'test-employee-id' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: team not in your domain')
    })

    it('should reject invalid employee ID', async () => {
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: mockTeamLead,
        isAuthenticated: true
      }))
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [] }) // Employee not found

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer test-tl-id'
        },
        body: JSON.stringify({ employee_id: 'invalid-employee-id' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Employee not found or inactive')
    })
  })

  describe('DELETE - Remove Member', () => {
    it('should remove member from team successfully', async () => {
      // Setup mocks
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: mockTeamLead,
        isAuthenticated: true
      }))
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-employee-id' }] }) // Member exists
      mockRemoveEmployeeFromTeam.mockResolvedValue(true)

      // Create request with memberId as query parameter
      const request = new NextRequest(
        'http://localhost:3000/api/team-lead/teams/test-team-id/members?memberId=test-employee-id',
        {
          method: 'DELETE',
          headers: { 'authorization': 'Bearer test-tl-id' }
        }
      )

      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Employee removed from team successfully')
      expect(mockRemoveEmployeeFromTeam).toHaveBeenCalledWith('test-team-id', 'test-employee-id')
    })

    it('should reject when memberId is missing', async () => {
      mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
        user: mockTeamLead,
        isAuthenticated: true
      }))

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'DELETE',
        headers: { 'authorization': 'Bearer test-tl-id' }
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('memberId parameter is required')
    })
  })
})
