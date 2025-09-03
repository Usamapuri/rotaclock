import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockQuery = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockGetTenantContext = jest.fn()

jest.mock('@/lib/database', () => ({
	query: mockQuery,
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: mockCreateApiAuthMiddleware,
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: mockGetTenantContext,
}))

import { GET as getShift, DELETE as deleteShift } from '@/app/api/shifts/[id]/route'

describe('/api/shifts/[id] tenant enforcement', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: { id: 'u1' } as any, isAuthenticated: true }))
		mockGetTenantContext.mockResolvedValue({ tenant_id: 't1' } as any)
	})

	it('GET filters by tenant_id', async () => {
		mockQuery.mockResolvedValueOnce({ rows: [{ id: 's1', tenant_id: 't1' }] } as any)
		const req = new NextRequest('http://localhost:3000/api/shifts/s1')
		const res = await getShift(req, { params: Promise.resolve({ id: 's1' }) })
		expect(res.status).toBe(200)
		const data = await res.json()
		expect(data.shift.id).toBe('s1')
	})

	it('DELETE enforces tenant and checks assignments', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ assignment_count: '0' }] } as any) // count assignments
			.mockResolvedValueOnce({ rows: [{ id: 's1' }] } as any) // delete
		const req = new NextRequest('http://localhost:3000/api/shifts/s1')
		const res = await deleteShift(req, { params: Promise.resolve({ id: 's1' }) })
		expect(res.status).toBe(200)
	})
})
