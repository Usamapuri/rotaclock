import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
	getShiftSwaps: jest.fn(),
	query: jest.fn(),
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: jest.fn(),
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: jest.fn(),
}))

import { GET } from '@/app/api/shifts/swap-requests/route'
import { getShiftSwaps } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const mockGetShiftSwaps = getShiftSwaps as jest.MockedFunction<typeof getShiftSwaps>
const mockCreateApiAuthMiddleware = createApiAuthMiddleware as jest.MockedFunction<typeof createApiAuthMiddleware>
const mockGetTenantContext = getTenantContext as jest.MockedFunction<typeof getTenantContext>

describe('/api/shifts/swap-requests GET (tenant-aware)', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		mockCreateApiAuthMiddleware.mockReturnValue(async () => ({ user: { id: 'u1', role: 'admin' } as any, isAuthenticated: true }))
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
