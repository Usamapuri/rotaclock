import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }
    
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const has_remarks = searchParams.get('has_remarks')
    
    let queryText = `
      SELECT 
        sl.id,
        sl.employee_id,
        sl.clock_in_time,
        sl.clock_out_time,
        sl.total_calls_taken,
        sl.leads_generated,
        sl.shift_remarks,
        sl.performance_rating,
        sl.status,
        sl.created_at,
        e.first_name,
        e.last_name,
        e.email,
        e.employee_id as emp_id
      FROM shift_logs sl
      LEFT JOIN employees e ON sl.employee_id = e.id
      WHERE e.team_id = $1 AND sl.status = 'completed'
    `
    
    const queryParams: any[] = [team.id]
    let paramIndex = 2
    
    if (employee_id) {
      queryText += ` AND sl.employee_id = $${paramIndex}`
      queryParams.push(employee_id)
      paramIndex++
    }
    
    if (date_from) {
      queryText += ` AND DATE(sl.clock_in_time) >= $${paramIndex}`
      queryParams.push(date_from)
      paramIndex++
    }
    
    if (date_to) {
      queryText += ` AND DATE(sl.clock_in_time) <= $${paramIndex}`
      queryParams.push(date_to)
      paramIndex++
    }
    
    if (has_remarks === 'true') {
      queryText += ` AND sl.shift_remarks IS NOT NULL AND sl.shift_remarks != ''`
    } else if (has_remarks === 'false') {
      queryText += ` AND (sl.shift_remarks IS NULL OR sl.shift_remarks = '')`
    }
    
    queryText += ` ORDER BY sl.clock_in_time DESC`
    
    const result = await query(queryText, queryParams)
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      team: {
        id: team.id,
        name: team.name,
        department: team.department
      }
    })
  } catch (error) {
    console.error('Error in GET /api/team-lead/meeting-notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
