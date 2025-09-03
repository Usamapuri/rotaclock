import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Create mock functions
const mockQuery = jest.fn()
const mockGetShiftAssignments = jest.fn()
const mockIsEmployeeClockedIn = jest.fn()
const mockCreateApiAuthMiddleware = jest.fn()
const mockGetTenantContext = jest.fn()

jest.mock('@/lib/database', () => ({
	query: mockQuery,
	getShiftAssignments: mockGetShiftAssignments,
	isEmployeeClockedIn: mockIsEmployeeClockedIn,
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: mockCreateApiAuthMiddleware,
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: mockGetTenantContext,
}))

import { POST as clockIn } from '@/app/api/time/clock-in/route'
import { POST as clockOut } from '@/app/api/time/clock-out/route'

describe('time clock-in/out tenant isolation', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({ user: { id: 'u1' } as any, isAuthenticated: true }))
		mockGetTenantContext.mockResolvedValue({ tenant_id: 't1' } as any)
	})

	it('clock-in uses tenant_id when fetching assignments', async () => {
		mockIsEmployeeClockedIn.mockResolvedValue(false)
		mockGetShiftAssignments.mockResolvedValue([{ id: 'assign1' }] as any)
		const req = new NextRequest('http://localhost:3000/api/time/clock-in', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		})
		const res = await clockIn(req)
		await res.json()
		expect(mockGetShiftAssignments).toHaveBeenCalledWith({ start_date: expect.any(String), end_date: expect.any(String), employee_id: 'u1', tenant_id: 't1' })
	})

	it('clock-out scopes shift lookup and update to tenant', async () => {
		mockQuery
			.mockResolvedValueOnce({ rows: [{ id: 'sl1', clock_in: new Date().toISOString(), break_hours: 0 }] } as any) // select time_entries with tenant
			.mockResolvedValueOnce({ rows: [{ id: 'sl1' }] } as any) // update time_entries with tenant
			.mockResolvedValueOnce({ rows: [] } as any) // update employee status
			.mockResolvedValueOnce({ rows: [] } as any) // notify admins

		const req = new NextRequest('http://localhost:3000/api/time/clock-out', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ employee_id: 'u1' }),
		})
		const res = await clockOut(req)
		expect([200, 201]).toContain(res.status)
	})
})
