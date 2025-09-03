import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockGetShiftSwaps = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockGetTenantContext = jest.fn()
const mockQuery = jest.fn()

jest.mock('@/lib/database', () => ({
	getShiftSwaps: mockGetShiftSwaps,
	query: mockQuery,
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: mockCreateApiAuthMiddleware,
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: mockGetTenantContext,
}))

import { GET } from '@/app/api/shifts/swap-requests/route'

describe('/api/shifts/swap-requests GET (tenant-aware)', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: { id: 'u1', role: 'admin' } as any, isAuthenticated: true }))
		mockGetTenantContext.mockResolvedValue({ tenant_id: 't1' } as any)
		mockGetShiftSwaps.mockResolvedValue([{ id: 'swap-1', tenant_id: 't1' }] as any)
	})

	it('returns swaps filtered by tenant', async () => {
		const req = new NextRequest('http://localhost:3000/api/shifts/swap-requests')
		const res = await GET(req)
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.data).toHaveLength(1)
		expect(mockGetShiftSwaps).toHaveBeenCalledWith({ tenant_id: 't1' })
	})
})
