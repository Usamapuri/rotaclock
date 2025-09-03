import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Explicit factory mocks to ensure routes see the same mocked instances
const mockQuery = jest.fn()
const mockGetTeamByLead = jest.fn()
const mockAddEmployeeToTeam = jest.fn()
const mockRemoveEmployeeFromTeam = jest.fn()
jest.mock('@/lib/database', () => ({
  query: mockQuery,
  getTeamByLead: mockGetTeamByLead,
  addEmployeeToTeam: mockAddEmployeeToTeam,
  removeEmployeeFromTeam: mockRemoveEmployeeFromTeam,
}))

const mockCreateApiAuthMiddleware = jest.fn()
const mockIsTeamLead = jest.fn()
jest.mock('@/lib/api-auth', () => ({
  createApiAuthMiddleware: mockCreateApiAuthMiddleware,
  isTeamLead: mockIsTeamLead,
}))

// Import after mocking
import { POST, DELETE } from '@/app/api/team-lead/teams/[id]/members/route'

// Use the above mock fns directly

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
    id: '00000000-0000-0000-0000-000000000001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@test.com',
    is_active: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: mockTeamLead, isAuthenticated: true }))
    mockIsTeamLead.mockReturnValue(true)
    mockGetTeamByLead.mockResolvedValue(mockTeam)
    mockQuery.mockImplementation(async (text?: any, params?: any[]) => {
      const sql = String(text || '')
      if (/FROM\s+employees\s+WHERE\s+(id|employee_code)\s*=\s*\$1/i.test(sql)) {
        const idOrCode = params?.[0]
        if (idOrCode) return { rows: [{ id: idOrCode, employee_code: 'EMP_TL', email: 'tl@test.com', role: 'team_lead' }], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
  })

  describe('POST - Add Member', () => {
    it('should add member to team successfully', async () => {
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [mockEmployee] })
      mockAddEmployeeToTeam.mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer test-tl-id'
        },
        body: JSON.stringify({ employee_id: '00000000-0000-0000-0000-000000000001' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Employee added to team successfully')
      expect(mockGetTeamByLead).toHaveBeenCalled()
      expect(mockAddEmployeeToTeam).toHaveBeenCalledWith('test-team-id', '00000000-0000-0000-0000-000000000001')
    })

    it('should reject unauthorized access', async () => {
      // Simulate unauthenticated by returning no user
      mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: null as any, isAuthenticated: false }))

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: '00000000-0000-0000-0000-000000000001' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject non-team-lead users', async () => {
      // Simulate non team lead
      mockIsTeamLead.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: '00000000-0000-0000-0000-000000000001' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject adding member to wrong team', async () => {
      mockGetTeamByLead.mockResolvedValue({ ...mockTeam, id: 'different-team-id' })

      const request = new NextRequest('http://localhost:3000/api/team-lead/teams/test-team-id/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': 'Bearer test-tl-id'
        },
        body: JSON.stringify({ employee_id: '00000000-0000-0000-0000-000000000001' })
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-team-id' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: team not in your domain')
    })

    it('should reject invalid employee ID', async () => {
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [] })

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
      mockGetTeamByLead.mockResolvedValue(mockTeam)
      mockQuery.mockResolvedValue({ rows: [{ id: '00000000-0000-0000-0000-000000000001' }] })
      mockRemoveEmployeeFromTeam.mockResolvedValue(true)

      const request = new NextRequest(
        'http://localhost:3000/api/team-lead/teams/test-team-id/members?memberId=00000000-0000-0000-0000-000000000001',
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
      expect(mockRemoveEmployeeFromTeam).toHaveBeenCalledWith('test-team-id', '00000000-0000-0000-0000-000000000001')
    })

    it('should reject when memberId is missing', async () => {
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
