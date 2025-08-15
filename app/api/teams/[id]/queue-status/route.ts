import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const teamId = id
    const result = await query(
      `SELECT 
         e.id,
         e.first_name,
         e.last_name,
         e.employee_id,
         pm.calls_handled,
         pm.avg_handle_time,
         CASE 
           WHEN te.status = 'in-progress' THEN 'available'
           WHEN te.status = 'break' THEN 'break'
           WHEN bl.status = 'active' THEN 'break'
           WHEN sl.status = 'active' THEN 'available'
           ELSE 'unavailable'
         END as availability_status
       FROM employees e
       LEFT JOIN performance_metrics pm ON e.id = pm.employee_id AND pm.date = CURRENT_DATE
       LEFT JOIN time_entries te ON e.id = te.employee_id AND te.status IN ('in-progress', 'break')
       LEFT JOIN shift_logs sl ON e.id = sl.employee_id AND sl.status = 'active'
       LEFT JOIN break_logs bl ON e.id = bl.employee_id AND bl.status = 'active'
       WHERE e.team_id = $1 AND e.is_active = true
       ORDER BY e.first_name, e.last_name`,
      [teamId]
    )

    const availableAgents = result.rows.filter((r: any) => r.availability_status === 'available').length
    const onBreakAgents = result.rows.filter((r: any) => r.availability_status === 'break').length
    const totalCallsHandled = result.rows.reduce((sum: number, r: any) => sum + (r.calls_handled || 0), 0)
    const avgHandleTime = result.rows.length > 0 
      ? Math.round(result.rows.reduce((sum: number, r: any) => sum + (r.avg_handle_time || 0), 0) / result.rows.length)
      : 0

    const queue_stats = {
      available_agents: availableAgents,
      on_break_agents: onBreakAgents,
      total_calls_handled: totalCallsHandled,
      average_handle_time: avgHandleTime,
      estimated_wait_time: availableAgents > 0 ? Math.round(avgHandleTime / Math.max(1, availableAgents)) : 0
    }

    return NextResponse.json({ success: true, data: { agents: result.rows, queue_stats } })
  } catch (err) {
    console.error('GET /api/teams/[id]/queue-status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
