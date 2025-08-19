import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const teamId = params.id
		const result = await query(
			`SELECT e.*, ta.assigned_date, ta.is_active as team_assignment_active
			 FROM employees e
			 LEFT JOIN team_assignments ta ON e.id = ta.employee_id AND ta.team_id = $1 AND ta.is_active = true
			 WHERE e.team_id = $1 AND e.is_active = true
			 ORDER BY e.first_name, e.last_name`,
			[teamId]
		)
		return NextResponse.json({ success: true, data: result.rows })
	} catch (err) {
		console.error('GET /api/admin/teams/[id]/members error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
