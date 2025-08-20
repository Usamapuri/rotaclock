import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

const consolidateReportSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  summary: z.string().min(10, 'Summary must be at least 10 characters'),
  highlights: z.array(z.string()).optional(),
  concerns: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  send_to_pm: z.boolean().default(true)
})

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const validationResult = consolidateReportSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { 
      date_from, 
      date_to, 
      summary, 
      highlights = [], 
      concerns = [], 
      recommendations = [],
      send_to_pm 
    } = validationResult.data
    
    // Get all meeting notes for the date range
    const meetingNotesResult = await query(`
      SELECT 
        sl.id,
        sl.employee_id,
        sl.clock_in_time,
        sl.clock_out_time,
        sl.total_calls_taken,
        sl.leads_generated,
        sl.shift_remarks,
        sl.performance_rating,
        e.first_name,
        e.last_name,
        e.email
      FROM shift_logs sl
      LEFT JOIN employees e ON sl.employee_id = e.id
      WHERE e.team_id = $1 
        AND sl.status = 'completed'
        AND DATE(sl.clock_in_time) >= $2 
        AND DATE(sl.clock_in_time) <= $3
        AND sl.shift_remarks IS NOT NULL 
        AND sl.shift_remarks != ''
      ORDER BY sl.clock_in_time DESC
    `, [team.id, date_from, date_to])
    
    const meetingNotes = meetingNotesResult.rows
    
    // Calculate team statistics
    const totalShifts = meetingNotes.length
    const totalCalls = meetingNotes.reduce((sum, note) => sum + (note.total_calls_taken || 0), 0)
    const totalLeads = meetingNotes.reduce((sum, note) => sum + (note.leads_generated || 0), 0)
    const avgPerformance = meetingNotes.length > 0 
      ? meetingNotes.reduce((sum, note) => sum + (note.performance_rating || 0), 0) / meetingNotes.length 
      : 0
    
    // Create consolidated report
    const consolidatedReport = {
      id: crypto.randomUUID(),
      team_lead_id: user!.id,
      team_id: team.id,
      team_name: team.name,
      date_from,
      date_to,
      summary,
      highlights,
      concerns,
      recommendations,
      statistics: {
        total_shifts: totalShifts,
        total_calls: totalCalls,
        total_leads: totalLeads,
        average_performance: Math.round(avgPerformance * 10) / 10,
        employees_with_notes: new Set(meetingNotes.map(note => note.employee_id)).size
      },
      meeting_notes: meetingNotes,
      created_at: new Date().toISOString(),
      status: 'pending'
    }
    
    // Store the consolidated report
    const reportId = await query(`
      INSERT INTO team_reports (
        id, team_lead_id, team_id, team_name, date_from, date_to, 
        summary, highlights, concerns, recommendations, statistics, 
        meeting_notes, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `, [
      consolidatedReport.id,
      consolidatedReport.team_lead_id,
      consolidatedReport.team_id,
      consolidatedReport.team_name,
      consolidatedReport.date_from,
      consolidatedReport.date_to,
      consolidatedReport.summary,
      JSON.stringify(consolidatedReport.highlights),
      JSON.stringify(consolidatedReport.concerns),
      JSON.stringify(consolidatedReport.recommendations),
      JSON.stringify(consolidatedReport.statistics),
      JSON.stringify(consolidatedReport.meeting_notes),
      consolidatedReport.status,
      consolidatedReport.created_at
    ])
    
    // If send_to_pm is true, create a notification for the Project Manager
    if (send_to_pm) {
      // Find the Project Manager for this team
      const pmResult = await query(`
        SELECT mp.manager_id, e.first_name, e.last_name, e.email
        FROM manager_projects mp
        LEFT JOIN employees e ON mp.manager_id = e.id
        WHERE mp.project_id = (
          SELECT project_id FROM teams WHERE id = $1
        )
      `, [team.id])
      
      if (pmResult.rows.length > 0) {
        const pm = pmResult.rows[0]
        
        // Create notification for PM
        await query(`
          INSERT INTO notifications (
            user_id, title, message, type, related_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          pm.manager_id,
          'Team Report Available',
          `${team.name} team report for ${date_from} to ${date_to} is ready for review`,
          'team_report',
          consolidatedReport.id,
          new Date().toISOString()
        ])
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      data: {
        report_id: consolidatedReport.id,
        message: 'Report consolidated successfully',
        statistics: consolidatedReport.statistics,
        meeting_notes_count: meetingNotes.length
      }
    })
    
  } catch (error) {
    console.error('Error in POST /api/team-lead/meeting-notes/consolidate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
