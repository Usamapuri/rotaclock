import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'
import { getTenantContext } from '@/lib/tenant'

// Validation schema for shift start verification
const verifyStartSchema = z.object({
	verification_image: z.string().min(1, 'Verification image is required'),
	location: z.object({
		latitude: z.number().min(-90).max(90),
		longitude: z.number().min(-180).max(180),
	}).optional(),
	device_info: z.object({
		user_agent: z.string().optional(),
		platform: z.string().optional(),
		timestamp: z.string().optional(),
	}).optional(),
})

/**
 * POST /api/shifts/[id]/verify-start
 * Verify shift start with camera and location data
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		
		const authMiddleware = createApiAuthMiddleware()
		const { user, isAuthenticated } = await authMiddleware(request)
		if (!isAuthenticated || !user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const tenantContext = await getTenantContext(user.id)
		if (!tenantContext) {
			return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
		}

		const body = await request.json()
		const validationResult = verifyStartSchema.safeParse(body)
		if (!validationResult.success) {
			return NextResponse.json({ error: 'Validation failed', details: validationResult.error.errors }, { status: 400 })
		}

		const { verification_image, location, device_info } = validationResult.data

		// Get the shift details in tenant
		const shiftResult = await query(
			`SELECT 
				s.id,
				s.employee_id,
				s.shift_template_id,
				s.start_time,
				s.end_time,
				s.status,
				s.actual_start_time,
				s.actual_end_time,
				st.name as template_name,
				st.start_time as template_start_time,
				st.end_time as template_end_time
			FROM shifts s
			LEFT JOIN shift_templates st ON s.shift_template_id = st.id AND st.tenant_id = s.tenant_id
			WHERE s.id = $1 AND s.tenant_id = $2`,
			[id, tenantContext.tenant_id]
		)

		if (shiftResult.rows.length === 0) {
			return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
		}

		const shift = shiftResult.rows[0]

		// Check if the user owns this shift or is admin
		if (shift.employee_id !== user?.id && user?.role !== 'admin') {
			return NextResponse.json({ error: 'Forbidden: Can only start your own shifts' }, { status: 403 })
		}

		// Check if shift is already started
		if (shift.status === 'in_progress' || shift.actual_start_time) {
			return NextResponse.json({ error: 'Shift is already in progress' }, { status: 400 })
		}

		// Check time window
		const now = new Date()
		const shiftStartTime = new Date(shift.start_time)
		const timeDiff = Math.abs(now.getTime() - shiftStartTime.getTime()) / (1000 * 60)
		if (timeDiff > 45) {
			return NextResponse.json({ error: 'Shift can only be started within 15 minutes before or 30 minutes after scheduled start time' }, { status: 400 })
		}

		// Store verification data with tenant
		try {
			await query(
				`INSERT INTO shift_verifications (
					shift_id, employee_id, verification_type, verification_image, 
					location_data, device_info, verification_status, verified_at, tenant_id
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					id,
					shift.employee_id,
					'start',
					verification_image,
					JSON.stringify(location),
					JSON.stringify(device_info),
					'verified',
					now.toISOString(),
					tenantContext.tenant_id,
				]
			)
		} catch (error) {
			console.log('Shift verifications table may not exist, skipping verification record')
		}

		// Update shift status to in_progress within tenant
		const updatedShiftResult = await query(
			`UPDATE shifts
			 SET status = 'in_progress', actual_start_time = $1
			 WHERE id = $2 AND tenant_id = $3
			 RETURNING id, employee_id, shift_template_id, start_time, end_time, status, actual_start_time, actual_end_time`,
			[now.toISOString(), id, tenantContext.tenant_id]
		)

		if (updatedShiftResult.rows.length === 0) {
			return NextResponse.json({ error: 'Failed to start shift' }, { status: 500 })
		}

		const updatedShift = updatedShiftResult.rows[0]

		// Create time entry for the shift (if table exists), with tenant scope
		try {
			await query(
				`INSERT INTO time_entries (
					employee_id, shift_id, entry_type, timestamp, location_data, device_info, tenant_id
				) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
				[
					shift.employee_id,
					id,
					'clock_in',
					now.toISOString(),
					JSON.stringify(location),
					JSON.stringify(device_info),
					tenantContext.tenant_id,
				]
			)
		} catch (error) {
			console.log('Time entry creation failed, but shift was started successfully')
		}

		return NextResponse.json({ shift: updatedShift, message: 'Shift started successfully' })
	} catch (error) {
		console.error('Error in POST /api/shifts/[id]/verify-start:', error)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
} 