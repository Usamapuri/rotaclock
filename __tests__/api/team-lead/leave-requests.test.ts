import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/team-lead/leave-requests/route'
import { GET as GET_SINGLE, PATCH } from '@/app/api/team-lead/leave-requests/[id]/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
  getTeamByLead: jest.fn()
}))

jest.mock('@/lib/api-auth', () => ({
  createApiAuthMiddleware: jest.fn(),
  isTeamLead: jest.fn()
}))

const mockQuery = require('@/lib/database').query
const mockGetTeamByLead = require('@/lib/database').getTeamByLead
const mockCreateApiAuthMiddleware = require('@/lib/api-auth').createApiAuthMiddleware
const mockIsTeamLead = require('@/lib/api-auth').isTeamLead

describe('Team Lead Leave Requests API', () => {
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

  const mockLeaveRequest = {
    id: 'leave-123',
    employee_id: 'emp-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    emp_id: 'EMP001',
    department: 'Support',
    team_id: 'team-123',
    type: 'vacation',
    start_date: '2024-02-01',
    end_date: '2024-02-05',
    days_requested: 5,
    reason: 'Family vacation',
    status: 'pending',
    created_at: '2024-01-15T10:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default auth mock
    mockCreateApiAuthMiddleware.mockReturnValue(async () => ({
      user: mockTeamLead,
      isAuthenticated: true
    }))
    
    mockIsTeamLead.mockReturnValue(true)
    mockGetTeamByLead.mockResolvedValue(mockTeam)
  })

  describe('GET /api/team-lead/leave-requests', () => {
    it('should return leave requests for team lead\'s team', async () => {
      mockQuery.mockResolvedValue({ rows: [mockLeaveRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([mockLeaveRequest])
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.team_id = $1'),
        [mockTeam.id]
      )
    })

    it('should filter by status when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [mockLeaveRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests?status=pending')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND lr.status = $2'),
        [mockTeam.id, 'pending']
      )
    })

    it('should filter by leave type when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [mockLeaveRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests?leave_type=vacation')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND lr.type = $2'),
        [mockTeam.id, 'vacation']
      )
    })

    it('should return 403 if user is not a team lead', async () => {
      mockIsTeamLead.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Only team leads can access this endpoint')
    })

    it('should return 404 if no team found for team lead', async () => {
      mockGetTeamByLead.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No team found for this team lead')
    })
  })

  describe('GET /api/team-lead/leave-requests/[id]', () => {
    it('should return a specific leave request for team lead\'s team', async () => {
      mockQuery.mockResolvedValue({ rows: [mockLeaveRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockLeaveRequest)
    })

    it('should return 403 if leave request is not for team lead\'s team', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...mockLeaveRequest, team_id: 'other-team' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Can only access leave requests for team members')
    })

    it('should return 404 if leave request not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Leave request not found')
    })
  })

  describe('PATCH /api/team-lead/leave-requests/[id]', () => {
    it('should approve a pending leave request', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, team_id: mockTeam.id }] })
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, status: 'approved' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', team_lead_notes: 'Approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Leave request approved successfully')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE leave_requests SET status = $1'),
        expect.arrayContaining(['approved', mockTeamLead.id, 'leave-123'])
      )
    })

    it('should reject a pending leave request', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, team_id: mockTeam.id }] })
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, status: 'rejected' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected', team_lead_notes: 'Rejected' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Leave request rejected successfully')
    })

    it('should return 400 if trying to approve/reject non-pending request', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...mockLeaveRequest, status: 'approved', team_id: mockTeam.id }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Can only approve/reject pending requests')
    })

    it('should return 403 if leave request is not for team lead\'s team', async () => {
      mockQuery.mockResolvedValue({ rows: [{ ...mockLeaveRequest, team_id: 'other-team' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Can only manage leave requests for team members')
    })

    it('should return 400 for invalid status', async () => {
      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })

    it('should handle team lead notes correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, team_id: mockTeam.id }] })
        .mockResolvedValueOnce({ rows: [{ ...mockLeaveRequest, status: 'approved', admin_notes: 'Team lead approved' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/leave-requests/leave-123', {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'approved', 
          team_lead_notes: 'Team lead approved' 
        })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'leave-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('admin_notes = $4'),
        expect.arrayContaining(['Team lead approved'])
      )
    })
  })
})
