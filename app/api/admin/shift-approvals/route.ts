import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authMiddleware = createApiAuthMiddleware()
    const authResult = await authMiddleware(request)
    if (!('isAuthenticated' in authResult) || !authResult.isAuthenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build the query based on status filter
    let whereClause = ''
    let params: any[] = []
    
    if (status === 'pending') {
      whereClause = 'WHERE sl.approval_status = $1 AND sl.status = $2'
      params.push('pending', 'completed')
    } else if (status === 'approved') {
      whereClause = 'WHERE sl.approval_status = $1 AND sl.status = $2'
      params.push('approved', 'completed')
    } else if (status === 'rejected') {
      whereClause = 'WHERE sl.approval_status = $1 AND sl.status = $2'
      params.push('rejected', 'completed')
    } else if (status === 'all') {
      whereClause = 'WHERE sl.approval_status IN ($1, $2, $3) AND sl.status = $4'
      params.push('pending', 'approved', 'rejected', 'completed')
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM shift_logs sl
      JOIN employees_new e ON sl.employee_id = e.id
      ${whereClause}
    `
    const countResult = await query(countQuery, params)
    const total = parseInt(countResult.rows[0].total)

    // Get shift approvals with pagination
    const approvalsQuery = `
      SELECT 
        sl.id,
        sl.employee_id,
        sl.shift_assignment_id,
        sl.clock_in_time,
        sl.clock_out_time,
        sl.total_shift_hours,
        sl.break_time_used,
        sl.total_calls_taken,
        sl.leads_generated,
        sl.shift_remarks,
        sl.performance_rating,
        sl.approval_status,
        sl.admin_notes,
        sl.rejection_reason,
        sl.created_at,
        sl.updated_at,
        e.first_name,
        e.last_name,
        e.employee_code,
        e.department,
        e.job_position,
        e.hourly_rate,
        sa.date as shift_date,
        s.name as shift_name,
        s.start_time as scheduled_start_time,
        s.end_time as scheduled_end_time,
        approver.first_name as approver_first_name,
        approver.last_name as approver_last_name
      FROM shift_logs sl
      JOIN employees_new e ON sl.employee_id = e.id
      LEFT JOIN shift_assignments_new sa ON sl.shift_assignment_id = sa.id
      LEFT JOIN shift_templates s ON sa.template_id = s.id
      LEFT JOIN employees_new approver ON sl.approved_by = approver.id
      ${whereClause}
      ORDER BY sl.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    
    const approvalsResult = await query(approvalsQuery, [...params, limit, offset])
    const approvals = approvalsResult.rows

    // Calculate summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_count,
        SUM(total_shift_hours) FILTER (WHERE approval_status = 'pending') as pending_hours,
        SUM(total_shift_hours) FILTER (WHERE approval_status = 'approved') as approved_hours
      FROM shift_logs
      WHERE approval_status IN ('pending', 'approved', 'rejected') AND status = 'completed'
    `
    const statsResult = await query(statsQuery)
    const stats = statsResult.rows[0]

    return NextResponse.json({
      success: true,
      data: {
        approvals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats: {
          pending: parseInt(stats.pending_count) || 0,
          approved: parseInt(stats.approved_count) || 0,
          rejected: parseInt(stats.rejected_count) || 0,
          pendingHours: parseFloat(stats.pending_hours) || 0,
          approvedHours: parseFloat(stats.approved_hours) || 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching shift approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift approvals' },
      { status: 500 }
    )
  }
}
