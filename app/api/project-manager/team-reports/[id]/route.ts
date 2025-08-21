import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { z } from 'zod'

const updateReportSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'approved', 'rejected']),
  pm_notes: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isProjectManager(user)) {
      return NextResponse.json({ error: 'Forbidden: Only project managers can access this endpoint' }, { status: 403 })
    }
    
    const { id } = await params
    
    // Get the specific report and verify it belongs to a team managed by this PM
    const result = await query(`
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
      WHERE tr.id = $1 AND tr.team_id IN (
        SELECT DISTINCT t.id
        FROM teams t
        INNER JOIN manager_projects mp ON t.project_id = mp.project_id
        WHERE mp.manager_id = $2 AND t.is_active = true
      )
    `, [id, user!.id])
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error in GET /api/project-manager/team-reports/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isProjectManager(user)) {
      return NextResponse.json({ error: 'Forbidden: Only project managers can access this endpoint' }, { status: 403 })
    }
    
    const body = await request.json()
    const validationResult = updateReportSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { status, pm_notes } = validationResult.data
    
    const { id } = await params
    
    // Verify the report belongs to a team managed by this PM
    const verifyResult = await query(`
      SELECT tr.id, tr.team_name
      FROM team_reports tr
      WHERE tr.id = $1 AND tr.team_id IN (
        SELECT DISTINCT t.id
        FROM teams t
        INNER JOIN manager_projects mp ON t.project_id = mp.project_id
        WHERE mp.manager_id = $2 AND t.is_active = true
      )
    `, [id, user!.id])
    
    if (verifyResult.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 })
    }
    
    // Update the report
    const updateResult = await query(`
      UPDATE team_reports 
      SET 
        status = $1,
        pm_notes = $2,
        pm_reviewed_by = $3,
        pm_reviewed_at = $4,
        updated_at = $5
      WHERE id = $6
      RETURNING *
    `, [
      status,
      pm_notes || null,
      user!.id,
      new Date().toISOString(),
      new Date().toISOString(),
      id
    ])
    
    const updatedReport = updateResult.rows[0]
    
    // Create notification for team lead
    await query(`
      INSERT INTO notifications (
        user_id, title, message, type, related_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      updatedReport.team_lead_id,
      'Team Report Reviewed',
      `Your team report for ${updatedReport.team_name} has been ${status} by the Project Manager`,
      'team_report_review',
      updatedReport.id,
      new Date().toISOString()
    ])
    
    return NextResponse.json({ 
      success: true, 
      data: updatedReport,
      message: `Report ${status} successfully`
    })
  } catch (error) {
    console.error('Error in PATCH /api/project-manager/team-reports/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
