import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isProjectManager(user)) {
      return NextResponse.json({ error: 'Forbidden: Only project managers can access this endpoint' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')
    const status = searchParams.get('status')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    
    // Get teams managed by this PM
    const managedTeamsResult = await query(`
      SELECT DISTINCT t.id, t.name, t.department
      FROM teams t
      INNER JOIN manager_projects mp ON t.project_id = mp.project_id
      WHERE mp.manager_id = $1 AND t.is_active = true
    `, [user!.id])
    
    if (managedTeamsResult.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [],
        managed_teams: [],
        message: 'No teams found for this project manager'
      })
    }
    
    const managedTeamIds = managedTeamsResult.rows.map(team => team.id)
    
    let queryText = `
      SELECT 
        tr.id,
        tr.team_id,
        tr.team_name,
        tr.date_from,
        tr.date_to,
        tr.summary,
        tr.highlights,
        tr.concerns,
        tr.recommendations,
        tr.statistics,
        tr.status,
        tr.pm_notes,
        tr.pm_reviewed_at,
        tr.created_at,
        tr.updated_at,
        tl.first_name as team_lead_first_name,
        tl.last_name as team_lead_last_name,
        tl.email as team_lead_email,
        pm.first_name as pm_first_name,
        pm.last_name as pm_last_name,
        pm.email as pm_email
      FROM team_reports tr
      LEFT JOIN employees tl ON tr.team_lead_id = tl.id
      LEFT JOIN employees pm ON tr.pm_reviewed_by = pm.id
      WHERE tr.team_id = ANY($1)
    `
    
    const queryParams: any[] = [managedTeamIds]
    let paramIndex = 2
    
    if (team_id) {
      queryText += ` AND tr.team_id = $${paramIndex}`
      queryParams.push(team_id)
      paramIndex++
    }
    
    if (status) {
      queryText += ` AND tr.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }
    
    if (date_from) {
      queryText += ` AND tr.date_from >= $${paramIndex}`
      queryParams.push(date_from)
      paramIndex++
    }
    
    if (date_to) {
      queryText += ` AND tr.date_to <= $${paramIndex}`
      queryParams.push(date_to)
      paramIndex++
    }
    
    queryText += ` ORDER BY tr.created_at DESC`
    
    const result = await query(queryText, queryParams)
    
    // Calculate summary statistics
    const totalReports = result.rows.length
    const pendingReports = result.rows.filter(r => r.status === 'pending').length
    const reviewedReports = result.rows.filter(r => r.status === 'reviewed').length
    const approvedReports = result.rows.filter(r => r.status === 'approved').length
    const rejectedReports = result.rows.filter(r => r.status === 'rejected').length
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      managed_teams: managedTeamsResult.rows,
      summary: {
        total_reports: totalReports,
        pending_reports: pendingReports,
        reviewed_reports: reviewedReports,
        approved_reports: approvedReports,
        rejected_reports: rejectedReports
      }
    })
  } catch (error) {
    console.error('Error in GET /api/project-manager/team-reports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
