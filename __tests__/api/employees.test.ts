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

import { GET } from '@/app/api/employees/route'

describe('/api/employees GET (tenant-aware)', () => {
	beforeEach(() => {
		jest.clearAllMocks()

		mockCreateApiAuthMiddleware.mockImplementation(() => async () => ({
			user: { id: 'user-1', email: 'admin@test.com', role: 'admin' } as any,
			isAuthenticated: true,
		}))

		mockGetTenantContext.mockResolvedValue({
			tenant_id: 'tenant-1',
			organization_id: 'org-1',
			organization_name: 'Org One',
			subscription_status: 'trial',
			subscription_plan: 'starter',
		} as any)

		mockQuery.mockImplementation(async (sql: string) => {
			if (sql.includes('COUNT(DISTINCT e.id) as total')) {
				return { rows: [{ total: '1' }] } as any
			}
			return {
				rows: [
					{
						id: 'emp-1',
						employee_id: 'EMP001',
						first_name: 'John',
						last_name: 'Doe',
						email: 'john@example.com',
						department: 'Sales',
						job_position: 'Agent',
						role: 'employee',
						hire_date: '2024-01-01',
						manager_id: null,
						team_id: null,
						hourly_rate: null,
						max_hours_per_week: null,
						is_active: true,
						is_online: false,
						last_online: null,
						team_name: null,
						manager_name: null,
						total_assignments: '0',
						total_time_entries: '0',
						total_hours_worked: '0',
					},
				],
			} as any
		})
	})

	it('returns tenant-filtered employees with pagination', async () => {
		const req = new NextRequest('http://localhost:3000/api/employees')
		const res = await GET(req)
		const data = await res.json()

		expect(res.status).toBe(200)
		expect(data.success).toBe(true)
		expect(Array.isArray(data.data)).toBe(true)
		expect(data.data).toHaveLength(1)
		expect(data.pagination.total).toBe(1)
	})
})
