import { NextRequest } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  if (!teamId) return new Response('teamId required', { status: 400 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any, eventType: string = 'update') => {
        const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(event))
      }

      const heartbeat = () => send({ timestamp: new Date().toISOString() }, 'heartbeat')

      const sendSnapshot = async () => {
        try {
          const live = await query(`
            SELECT e.id, e.first_name, e.last_name, e.employee_id,
                   CASE WHEN te.status = 'in-progress' THEN 'online'
                        WHEN te.status = 'break' THEN 'break'
                        WHEN bl.status = 'active' THEN 'break'
                        WHEN sl.status = 'active' THEN 'online'
                        ELSE 'offline' END as status
            FROM employees e
            LEFT JOIN time_entries te ON e.id = te.employee_id AND te.status IN ('in-progress','break')
            LEFT JOIN shift_logs sl ON e.id = sl.employee_id AND sl.status = 'active'
            LEFT JOIN break_logs bl ON e.id = bl.employee_id AND bl.status = 'active'
            WHERE e.team_id = $1 AND e.is_active = true
            ORDER BY e.first_name, e.last_name`, [teamId])

          const stats = {
            total_members: live.rows.length,
            online: live.rows.filter((r: any) => r.status === 'online').length,
            on_break: live.rows.filter((r: any) => r.status === 'break').length,
            offline: live.rows.filter((r: any) => r.status === 'offline').length,
          }

          send({ type: 'snapshot', members: live.rows, stats }, 'team')
        } catch (e) {
          send({ type: 'error', message: 'Failed to load snapshot' }, 'error')
        }
      }

      sendSnapshot()
      const hbInt = setInterval(heartbeat, 30000)
      const upInt = setInterval(sendSnapshot, 10000)
      request.signal.addEventListener('abort', () => { clearInterval(hbInt); clearInterval(upInt); controller.close() })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
