import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockGetShiftAssignments = jest.fn()
const mockQuery = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockGetTenantContext = jest.fn()

jest.mock('@/lib/database', () => ({
	getShiftAssignments: mockGetShiftAssignments,
	query: mockQuery,
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: mockCreateApiAuthMiddleware,
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: mockGetTenantContext,
}))

import { GET, POST } from '@/app/api/shifts/assignments/route'

describe('/api/shifts/assignments (tenant-aware)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: { id: 'u1', role: 'admin' } as any, isAuthenticated: true }))
		mockGetTenantContext.mockResolvedValue({ tenant_id: 't1', organization_id: 'o1' } as any)
	})

	it('GET passes tenant_id to helper', async () => {
		mockGetShiftAssignments.mockResolvedValue([{ id: 'a1' }] as any)
		const req = new NextRequest('http://localhost:3000/api/shifts/assignments?start_date=2024-01-01&end_date=2024-01-07')
		const res = await GET(req)
		await res.json()
		expect(mockGetShiftAssignments).toHaveBeenCalledWith({ start_date: '2024-01-01', end_date: '2024-01-07', tenant_id: 't1' })
	})

	it('POST validates employees/shifts in tenant and inserts with tenant fields', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ id: 'e1' }] } as any) // employee exists
			.mockResolvedValueOnce({ rows: [{ id: 's1' }] } as any) // shift exists
			.mockResolvedValueOnce({ rows: [] } as any) // no conflict
			.mockResolvedValueOnce({ rows: [{ id: 'new-assignment' }] } as any) // inserted

		const req = new NextRequest('http://localhost:3000/api/shifts/assignments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ employee_id: 'e1', template_id: 's1', date: '2024-01-02' }),
		})
		const res = await POST(req)
		const json = await res.json()
		expect(res.status).toBe(201)
		expect(json.data.id).toBe('new-assignment')
	})
})
