import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isProjectManager } from '@/lib/api-auth'
import { withPerformanceMonitoring } from '@/lib/performance'

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

    // Set up SSE headers
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (data: any, eventType: string = 'update') => {
          const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(event))
        }

        const sendHeartbeat = () => {
          sendEvent({ timestamp: new Date().toISOString() }, 'heartbeat')
        }

        // Send initial data
        const sendInitialData = async () => {
          try {
            const [teamReports, managedTeams, notifications, summary] = await Promise.all([
              getTeamReports(user!.id),
              getManagedTeams(user!.id),
              getNotifications(user!.id),
              getSummaryStats(user!.id)
            ])

            sendEvent({
              type: 'initial',
              data: {
                teamReports,
                managedTeams,
                notifications,
                summary
              }
            }, 'pm')
          } catch (error) {
            console.error('Error sending initial data:', error)
            sendEvent({ type: 'error', message: 'Failed to load initial data' }, 'error')
          }
        }

        // Send real-time updates
        const sendUpdates = async () => {
          try {
            const [teamReports, notifications, summary] = await Promise.all([
              getTeamReports(user!.id),
              getNotifications(user!.id),
              getSummaryStats(user!.id)
            ])

            sendEvent({
              type: 'update',
              data: {
                teamReports,
                notifications,
                summary
              }
            }, 'pm')
          } catch (error) {
            console.error('Error sending updates:', error)
          }
        }

        // Initial data
        sendInitialData()

        // Set up intervals
        const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
        const updateInterval = setInterval(sendUpdates, 20000) // 20 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          clearInterval(updateInterval)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    })
  } catch (error) {
    console.error('Project Manager realtime error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTeamReports(userId: string) {
  // Get teams managed by this PM
  const managedTeamsResult = await query(`
    SELECT DISTINCT t.id, t.name
    FROM teams t
    JOIN manager_projects mp ON t.project_id = mp.project_id
    WHERE mp.manager_id = $1
  `, [userId])

  const teamIds = managedTeamsResult.rows.map((row: any) => row.id)

  if (teamIds.length === 0) {
    return []
  }

  const result = await query(`
    SELECT 
      tr.id,
      tr.team_id,
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
      t.name as team_name,
      e.first_name as team_lead_first_name,
      e.last_name as team_lead_last_name,
      e.email as team_lead_email
    FROM team_reports tr
    JOIN teams t ON tr.team_id = t.id
    JOIN employees e ON t.team_lead_id = e.id
    WHERE tr.team_id = ANY($1)
    ORDER BY tr.created_at DESC
    LIMIT 50
  `, [teamIds])

  return result.rows
}

async function getManagedTeams(userId: string) {
  const result = await query(`
    SELECT DISTINCT 
      t.id,
      t.name,
      t.department
    FROM teams t
    JOIN manager_projects mp ON t.project_id = mp.project_id
    WHERE mp.manager_id = $1
    ORDER BY t.name
  `, [userId])

  return result.rows
}

async function getNotifications(userId: string) {
  const result = await query(`
    SELECT 
      id,
      title,
      message,
      type,
      is_read,
      created_at
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 20
  `, [userId])

  return result.rows
}

async function getSummaryStats(userId: string) {
  // Get teams managed by this PM
  const managedTeamsResult = await query(`
    SELECT DISTINCT t.id
    FROM teams t
    JOIN manager_projects mp ON t.project_id = mp.project_id
    WHERE mp.manager_id = $1
  `, [userId])

  const teamIds = managedTeamsResult.rows.map((row: any) => row.id)

  if (teamIds.length === 0) {
    return {
      total_reports: 0,
      pending_reports: 0,
      reviewed_reports: 0,
      approved_reports: 0,
      rejected_reports: 0
    }
  }

  const result = await query(`
    SELECT 
      COUNT(*) as total_reports,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_reports,
      COUNT(*) FILTER (WHERE status = 'reviewed') as reviewed_reports,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_reports,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected_reports
    FROM team_reports
    WHERE team_id = ANY($1)
  `, [teamIds])

  return result.rows[0]
}
