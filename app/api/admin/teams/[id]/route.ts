import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin, withRlsTenant } from '@/lib/api-auth'

async function _GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated || !isAdmin(user)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id: teamId } = await params
		const result = await query(
			`SELECT t.*, e.first_name as team_lead_first_name, e.last_name as team_lead_last_name, e.email as team_lead_email,
				(SELECT COUNT(*) FROM employees m WHERE m.team_id = t.id AND m.is_active = true) as member_count
			 FROM teams t
			 LEFT JOIN employees e ON t.team_lead_id = e.id
			 WHERE t.id = $1`,
			[teamId]
		)
		if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
		return NextResponse.json({ success: true, data: result.rows[0] })
	} catch (err) {
		console.error('GET /api/admin/teams/[id] error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function _PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated || !isAdmin(user)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id: teamId } = await params
		const body = await request.json()
		const { name, department, team_lead_id, description, is_active } = body

		const updates: string[] = []
		const values: any[] = []
		let idx = 1
		if (name !== undefined) { updates.push(`name = $${idx}`); values.push(name); idx++ }
		if (department !== undefined) { updates.push(`department = $${idx}`); values.push(department); idx++ }
		if (team_lead_id !== undefined) { updates.push(`team_lead_id = $${idx}`); values.push(team_lead_id); idx++ }
		if (description !== undefined) { updates.push(`description = $${idx}`); values.push(description); idx++ }
		if (is_active !== undefined) { updates.push(`is_active = $${idx}`); values.push(!!is_active); idx++ }
		if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

		values.push(teamId)
		const sql = `UPDATE teams SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`
		const result = await query(sql, values)
		if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
		return NextResponse.json({ success: true, data: result.rows[0] })
	} catch (err) {
		console.error('PUT /api/admin/teams/[id] error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

async function _DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const auth = createApiAuthMiddleware()
		const { user, isAuthenticated } = await auth(request)
		if (!isAuthenticated || !isAdmin(user)) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { id: teamId } = await params
		const result = await query(`UPDATE teams SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, [teamId])
		if (result.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
		return NextResponse.json({ success: true })
	} catch (err) {
		console.error('DELETE /api/admin/teams/[id] error:', err)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
export const PUT = withRlsTenant(_PUT)
export const DELETE = withRlsTenant(_DELETE)
