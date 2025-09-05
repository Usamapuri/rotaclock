import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const { searchParams } = new URL(request.url)
		const department = searchParams.get('department')

		let sql = `
			SELECT 
				e.*,
				t.name as team_name,
				t.department as team_department,
				COUNT(ta.employee_id) as member_count,
				AVG(pm.quality_score) as quality_score,
				AVG(pm.productivity_score) as performance_score
			FROM employees e
			LEFT JOIN teams t ON e.team_id = t.id AND t.tenant_id = $1
			LEFT JOIN team_assignments ta ON t.id = ta.team_id AND ta.is_active = true AND ta.tenant_id = $1
			LEFT JOIN performance_metrics pm ON e.id = pm.employee_id AND pm.tenant_id = $1
			WHERE e.tenant_id = $1 AND e.role = 'team_lead'
		`
		const params: any[] = [user.tenant_id]
		let idx = 2
		if (department) {
			sql += ` AND e.department = $${idx}`
			params.push(department)
			idx++
		}
		sql += ' GROUP BY e.id, t.name, t.department ORDER BY e.first_name, e.last_name'

		const result = await query(sql, params)
		return NextResponse.json({ success: true, data: result.rows })
	} catch (err) {
		console.error('GET /api/admin/team-leads error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
