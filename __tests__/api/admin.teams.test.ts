import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockQuery = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockGetTenantContext = jest.fn()
const mockIsAdmin = jest.fn()

jest.mock('@/lib/database', () => ({
	query: mockQuery,
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: mockCreateApiAuthMiddleware,
	isAdmin: mockIsAdmin,
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: mockGetTenantContext,
}))

import { GET as TEAMS_GET, POST as TEAMS_POST } from '@/app/api/admin/teams/route'
import { GET as MEMBERS_GET, POST as MEMBERS_POST } from '@/app/api/admin/teams/[id]/members/route'

describe('admin/teams tenant scoping', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: { id: 'admin', role: 'admin' } as any, isAuthenticated: true }))
		mockGetTenantContext.mockResolvedValue({ tenant_id: 't1', organization_id: 'o1' } as any)
	})

	it('GET /admin/teams filters by tenant_id', async () => {
		mockQuery.mockResolvedValueOnce({ rows: [] } as any)
		const req = new NextRequest('http://localhost:3000/api/admin/teams')
		const res = await TEAMS_GET(req)
		expect(res.status).toBe(200)
		expect(mockQuery.mock.calls[0][0]).toContain('t.tenant_id = $1')
	})

	it('POST /admin/teams inserts with tenant_id and org', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ id: 'lead1' }] } as any) // leadCheck
			.mockResolvedValueOnce({ rows: [] } as any) // update role
			.mockResolvedValueOnce({ rows: [{ id: 'team1' }] } as any) // insert team

		const req = new NextRequest('http://localhost:3000/api/admin/teams', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'A', department: 'Sales', team_lead_id: 'lead1' }),
		})
		const res = await TEAMS_POST(req)
		expect(res.status).toBe(201)
		const insertCall = mockQuery.mock.calls.find(([sql]) => (sql as string).includes('INSERT INTO teams'))
		expect(insertCall?.[0]).toContain('tenant_id')
	})

	it('GET /admin/teams/[id]/members filters by tenant_id', async () => {
		mockQuery.mockResolvedValueOnce({ rows: [] } as any)
		const req = new NextRequest('http://localhost:3000/api/admin/teams/X/members')
		const res = await MEMBERS_GET(req, { params: { id: 'X' } })
		expect(res.status).toBe(200)
		expect(mockQuery.mock.calls[0][0]).toContain('e.tenant_id = $2')
	})

	it('POST /admin/teams/[id]/members updates member with tenant guard', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ id: 'X' }] } as any) // team check
			.mockResolvedValueOnce({ rows: [{ id: 'emp' }] } as any) // emp check
			.mockResolvedValueOnce({ rows: [{ id: 'emp' }] } as any) // update

		const req = new NextRequest('http://localhost:3000/api/admin/teams/X/members', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ employee_id: 'emp' }),
		})
		const res = await MEMBERS_POST(req, { params: { id: 'X' } })
		expect(res.status).toBe(200)
		const updateCall = mockQuery.mock.calls.find(([sql]) => (sql as string).startsWith('UPDATE employees'))
		expect(updateCall?.[0]).toContain('tenant_id = $3')
	})
})
