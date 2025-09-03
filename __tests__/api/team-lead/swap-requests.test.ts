import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Rely on manual mocks in __mocks__
jest.mock('@/lib/database')
jest.mock('@/lib/api-auth')

import { GET } from '@/app/api/team-lead/shifts/swap-requests/route'
import { GET as GET_SINGLE, PATCH } from '@/app/api/team-lead/shifts/swap-requests/[id]/route'

type Mocked<T> = T & { [K in keyof T]: jest.Mock }
const db = jest.requireMock('@/lib/database') as Mocked<typeof import('@/lib/database')>
const auth = jest.requireMock('@/lib/api-auth') as Mocked<typeof import('@/lib/api-auth')>

describe('Team Lead Swap Requests API', () => {
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

  const mockSwapRequest = {
    id: 'swap-123',
    requester_id: 'emp-1',
    target_id: 'emp-2',
    requester_first_name: 'John',
    requester_last_name: 'Doe',
    requester_email: 'john@example.com',
    target_first_name: 'Jane',
    target_last_name: 'Smith',
    target_email: 'jane@example.com',
    original_shift_date: '2024-01-15',
    original_start_time: '09:00',
    original_end_time: '17:00',
    requested_shift_date: '2024-01-16',
    requested_start_time: '10:00',
    requested_end_time: '18:00',
    reason: 'Personal emergency',
    status: 'pending',
    created_at: '2024-01-10T10:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    auth.isTeamLead.mockReturnValue(true)
    db.getTeamByLead.mockResolvedValue(mockTeam)
  })

  describe('GET /api/team-lead/shifts/swap-requests', () => {
    it('should return swap requests for team lead\'s team', async () => {
      db.query.mockResolvedValue({ rows: [mockSwapRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([mockSwapRequest])
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (r.team_id = $1 OR t.team_id = $1)'),
        [mockTeam.id]
      )
    })

    it('should filter by status when provided', async () => {
      db.query.mockResolvedValue({ rows: [mockSwapRequest] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests?status=pending')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ss.status = $2'),
        [mockTeam.id, 'pending']
      )
    })

    it('should return 403 if user is not a team lead', async () => {
      auth.isTeamLead.mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Only team leads can access this endpoint')
    })

    it('should return 404 if no team found for team lead', async () => {
      db.getTeamByLead.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No team found for this team lead')
    })
  })

  describe('GET /api/team-lead/shifts/swap-requests/[id]', () => {
    it('should return a specific swap request for team lead\'s team', async () => {
      db.query.mockResolvedValue({ rows: [{ ...mockSwapRequest, requester_team_id: mockTeam.id }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual({ ...mockSwapRequest, requester_team_id: mockTeam.id })
    })

    it('should return 403 if swap request is not for team lead\'s team', async () => {
      db.query.mockResolvedValue({ rows: [{ ...mockSwapRequest, requester_team_id: 'other-team' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Can only access swap requests for team members')
    })

    it('should return 404 if swap request not found', async () => {
      db.query.mockResolvedValue({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123')
      const response = await GET_SINGLE(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Swap request not found')
    })
  })

  describe('PATCH /api/team-lead/shifts/swap-requests/[id]', () => {
    it('should approve a pending swap request', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ ...mockSwapRequest, requester_team_id: mockTeam.id, target_team_id: mockTeam.id }] })
        .mockResolvedValueOnce({ rows: [{ ...mockSwapRequest, status: 'approved' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved', team_lead_notes: 'Approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Swap request approved successfully')
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE shift_swaps'),
        expect.arrayContaining(['approved'])
      )
    })

    it('should deny a pending swap request', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ ...mockSwapRequest, requester_team_id: mockTeam.id, target_team_id: mockTeam.id }] })
        .mockResolvedValueOnce({ rows: [{ ...mockSwapRequest, status: 'denied' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'denied', team_lead_notes: 'Denied' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Swap request denied successfully')
    })

    it('should return 400 if trying to approve/deny non-pending request', async () => {
      db.query.mockResolvedValue({ rows: [{ ...mockSwapRequest, status: 'approved', requester_team_id: mockTeam.id }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Can only approve/deny pending requests')
    })

    it('should return 403 if swap request is not for team lead\'s team', async () => {
      db.query.mockResolvedValue({ rows: [{ ...mockSwapRequest, requester_team_id: 'other-team' }] })

      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden: Can only manage swap requests for team members')
    })

    it('should return 400 for invalid status', async () => {
      const request = new NextRequest('http://localhost:3000/api/team-lead/shifts/swap-requests/swap-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid' })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'swap-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
    })
  })
})
