import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const tenant = await getTenantContext(user.id)
		if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

		const { searchParams } = new URL(request.url)
		const department = searchParams.get('department')
		const isActive = searchParams.get('is_active')

		let sql = `
			SELECT 
				t.*,
				e.first_name as team_lead_first_name,
				e.last_name as team_lead_last_name,
				e.email as team_lead_email,
				COUNT(ta.employee_id) as member_count
			FROM teams t
			LEFT JOIN employees e ON t.team_lead_id = e.id AND e.tenant_id = t.tenant_id
			LEFT JOIN team_assignments ta ON t.id = ta.team_id AND ta.is_active = true
			WHERE t.tenant_id = $1
		`
		const params: any[] = [tenant.tenant_id]
		let idx = 2
		if (department) {
			sql += ` AND t.department = $${idx}`
			params.push(department)
			idx++
		}
		if (isActive !== null) {
			const active = isActive === 'true'
			sql += ` AND t.is_active = $${idx}`
			params.push(active)
			idx++
		}
		sql += ' GROUP BY t.id, e.first_name, e.last_name, e.email ORDER BY t.name'

		const result = await query(sql, params)
		return NextResponse.json({ success: true, data: result.rows })
	} catch (err) {
		console.error('GET /api/admin/teams error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		if (user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

		const tenant = await getTenantContext(user.id)
		if (!tenant) return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })

    const { name, department, team_lead_id, description } = await request.json()
		if (!name || !department || !team_lead_id) {
			return NextResponse.json({ error: 'name, department, team_lead_id are required' }, { status: 400 })
		}

		const leadCheck = await query('SELECT id FROM employees WHERE id = $1 AND tenant_id = $2', [team_lead_id, tenant.tenant_id])
		if (leadCheck.rows.length === 0) {
			return NextResponse.json({ error: 'Invalid team_lead_id' }, { status: 400 })
		}

    await query(`UPDATE employees SET role = 'team_lead', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, [team_lead_id, tenant.tenant_id])

    const createRes = await query(
			`INSERT INTO teams (name, department, team_lead_id, description, tenant_id, organization_id)
			 VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
			[name, department, team_lead_id, description || null, tenant.tenant_id, tenant.organization_id]
		)
		return NextResponse.json({ success: true, data: createRes.rows[0] }, { status: 201 })
	} catch (err) {
		console.error('POST /api/admin/teams error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
