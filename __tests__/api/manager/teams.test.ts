import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/manager/teams/route'
import { PATCH, DELETE } from '@/app/api/manager/teams/[id]/route'
import { POST as ADD_MEMBER, DELETE as REMOVE_MEMBER } from '@/app/api/manager/teams/[id]/members/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
    query: jest.fn()
}))

jest.mock('@/lib/api-auth', () => ({
    createApiAuthMiddleware: () => async () => ({
        isAuthenticated: true,
        user: { id: 'manager-123', role: 'manager' }
    })
}))

jest.mock('@/lib/tenant', () => ({
    getTenantContext: async () => ({
        tenant_id: 'tenant-123',
        organization_id: 'org-123'
    })
}))

describe('Manager Teams API', () => {
    const { query } = require('@/lib/database')

    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('GET /api/manager/teams', () => {
        it('should return teams for the manager', async () => {
            query.mockResolvedValueOnce({
                rows: [
                    { id: 'team-1', name: 'Sales', member_count: 5 }
                ]
            })

            const { req } = createMocks({
                method: 'GET',
            })

            const response = await GET(req)
            const data = await response.json()

            expect(response.status).toBe(200)
            expect(data.success).toBe(true)
            expect(data.data).toHaveLength(1)
            expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT t.*'), expect.any(Array))
        })
    })

    describe('POST /api/manager/teams', () => {
        it('should create a team and link it to manager', async () => {
            query.mockResolvedValueOnce({ rows: [] }) // BEGIN
            query.mockResolvedValueOnce({ // INSERT team
                rows: [{ id: 'new-team', name: 'New Team' }]
            })
            query.mockResolvedValueOnce({ rows: [] }) // INSERT manager_teams
            query.mockResolvedValueOnce({ rows: [] }) // COMMIT

            const { req } = createMocks({
                method: 'POST',
                body: {
                    name: 'New Team',
                    department: 'Sales'
                }
            })

            const response = await POST(req)
            const data = await response.json()

            expect(response.status).toBe(201)
            expect(data.success).toBe(true)
            expect(data.data.id).toBe('new-team')
        })
    })
})
