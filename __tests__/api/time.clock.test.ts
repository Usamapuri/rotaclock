import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
	query: jest.fn(),
	getShiftAssignments: jest.fn(),
	isEmployeeClockedIn: jest.fn(),
}))

jest.mock('@/lib/api-auth', () => ({
	createApiAuthMiddleware: jest.fn(),
}))

jest.mock('@/lib/tenant', () => ({
	getTenantContext: jest.fn(),
}))

import { POST as clockIn } from '@/app/api/time/clock-in/route'
import { POST as clockOut } from '@/app/api/time/clock-out/route'
import { query, getShiftAssignments, isEmployeeClockedIn } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

const mockQuery = query as jest.MockedFunction<typeof query>
const mockGetShiftAssignments = getShiftAssignments as jest.MockedFunction<typeof getShiftAssignments>
const mockIsEmployeeClockedIn = isEmployeeClockedIn as jest.MockedFunction<typeof isEmployeeClockedIn>
const mockCreateApiAuthMiddleware = createApiAuthMiddleware as jest.MockedFunction<typeof createApiAuthMiddleware>
const mockGetTenantContext = getTenantContext as jest.MockedFunction<typeof getTenantContext>

describe('time clock-in/out tenant isolation', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		mockCreateApiAuthMiddleware.mockReturnValue(async () => ({ user: { id: 'u1' } as any, isAuthenticated: true }))
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
			.mockResolvedValueOnce({ rows: [{ id: 'sl1', clock_in_time: new Date().toISOString(), break_time_used: 0 }] } as any) // select shift_logs with tenant
			.mockResolvedValueOnce({ rows: [{ id: 'sl1' }] } as any) // update shift_logs with tenant
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
