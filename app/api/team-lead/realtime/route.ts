import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { withPerformanceMonitoring } from '@/lib/performance'

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

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 })
    }

    // Verify team lead has access to this team
    const teamAccessResult = await query(`
      SELECT id FROM teams WHERE id = $1 AND team_lead_id = $2
    `, [teamId, user!.id])

    if (teamAccessResult.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 403 })
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
            const [teamMembers, requests, meetingNotes, notifications] = await Promise.all([
              getTeamMembers(teamId),
              getTeamRequests(teamId),
              getMeetingNotes(teamId),
              getNotifications(user!.id)
            ])

            sendEvent({
              type: 'initial',
              data: {
                teamMembers,
                requests,
                meetingNotes,
                notifications
              }
            }, 'teamlead')
          } catch (error) {
            console.error('Error sending initial data:', error)
            sendEvent({ type: 'error', message: 'Failed to load initial data' }, 'error')
          }
        }

        // Send real-time updates
        const sendUpdates = async () => {
          try {
            const [teamMembers, requests, meetingNotes, notifications] = await Promise.all([
              getTeamMembers(teamId),
              getTeamRequests(teamId),
              getMeetingNotes(teamId),
              getNotifications(user!.id)
            ])

            sendEvent({
              type: 'update',
              data: {
                teamMembers,
                requests,
                meetingNotes,
                notifications
              }
            }, 'teamlead')
          } catch (error) {
            console.error('Error sending updates:', error)
          }
        }

        // Initial data
        sendInitialData()

        // Set up intervals
        const heartbeatInterval = setInterval(sendHeartbeat, 30000) // 30 seconds
        const updateInterval = setInterval(sendUpdates, 15000) // 15 seconds

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
    console.error('Team Lead realtime error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTeamMembers(teamId: string) {
  const result = await query(`
    SELECT 
      e.id,
      e.employee_id,
      e.first_name,
      e.last_name,
      e.email,
      e.department,
      e.position,
      e.is_active,
      CASE 
        WHEN te.status = 'in-progress' THEN 'online'
        WHEN te.status = 'break' THEN 'break'
        WHEN bl.status = 'active' THEN 'break'
        WHEN sl.status = 'active' THEN 'online'
        ELSE 'offline'
      END as status
    FROM employees e
    LEFT JOIN time_entries te ON e.id = te.employee_id AND te.status IN ('in-progress', 'break')
    LEFT JOIN shift_logs sl ON e.id = sl.employee_id AND sl.status = 'active'
    LEFT JOIN break_logs bl ON e.id = bl.employee_id AND bl.status = 'active'
    WHERE e.team_id = $1 AND e.is_active = true
    ORDER BY e.first_name, e.last_name
  `, [teamId])

  return result.rows
}

async function getTeamRequests(teamId: string) {
  const result = await query(`
    SELECT 
      tr.id,
      tr.employee_id,
      tr.type,
      tr.amount,
      tr.reason,
      tr.status,
      tr.created_at,
      tr.updated_at,
      e.first_name,
      e.last_name,
      e.employee_id as emp_id
    FROM team_requests tr
    JOIN employees e ON tr.employee_id = e.id
    WHERE e.team_id = $1
    ORDER BY tr.created_at DESC
    LIMIT 50
  `, [teamId])

  return result.rows
}

async function getMeetingNotes(teamId: string) {
  const result = await query(`
    SELECT 
      mn.id,
      mn.employee_id,
      mn.clock_in_time,
      mn.clock_out_time,
      mn.total_calls_taken,
      mn.leads_generated,
      mn.shift_remarks,
      mn.performance_rating,
      mn.created_at,
      e.first_name,
      e.last_name,
      e.employee_id as emp_id
    FROM meeting_notes mn
    JOIN employees e ON mn.employee_id = e.id
    WHERE e.team_id = $1
    ORDER BY mn.created_at DESC
    LIMIT 50
  `, [teamId])

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
