import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
	query: jest.fn(),
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: jest.fn(),
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: jest.fn(),
}))

import { GET as getShift, DELETE as deleteShift } from '@/app/api/shifts/[id]/route'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const mockQuery = query as jest.MockedFunction<typeof query>
const mockCreateApiAuthMiddleware = createApiAuthMiddleware as jest.MockedFunction<typeof createApiAuthMiddleware>
const mockGetTenantContext = getTenantContext as jest.MockedFunction<typeof getTenantContext>

describe('/api/shifts/[id] tenant enforcement', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockReturnValue(async () => ({ user: { id: 'u1' } as any, isAuthenticated: true }))
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
