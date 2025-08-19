import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const { employee_id } = await request.json()
		if (!employee_id) return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })

		const emp = await query('SELECT id FROM employees WHERE id = $1', [employee_id])
		if (emp.rows.length === 0) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

		const updated = await query(`UPDATE employees SET role = 'team_lead', updated_at = NOW() WHERE id = $1 RETURNING *`, [employee_id])
		return NextResponse.json({ success: true, data: updated.rows[0] })
	} catch (err) {
		console.error('POST /api/admin/team-leads/assign error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
