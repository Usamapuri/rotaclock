import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { process_id, step_id } = body

    // Delete step completion
    await query(`
      DELETE FROM step_completions 
      WHERE process_id = $1 AND step_id = $2
    `, [process_id, step_id])

    // Recalculate progress (same logic as complete endpoint)
    const processResult = await query(`
      SELECT template_id FROM onboarding_processes WHERE id = $1
    `, [process_id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    const totalStepsResult = await query(`
      SELECT COUNT(*) as count FROM onboarding_steps WHERE template_id = $1
    `, [process.template_id])

    const totalSteps = parseInt(totalStepsResult.rows[0].count)

    const completedStepsResult = await query(`
      SELECT COUNT(*) as count FROM step_completions WHERE process_id = $1
    `, [process_id])

    const completedSteps = parseInt(completedStepsResult.rows[0].count)

    const progress = totalSteps ? (completedSteps / totalSteps) * 100 : 0
    const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"

    await query(`
      UPDATE onboarding_processes
      SET 
        progress = $1,
        status = $2,
        actual_completion_date = $3,
        updated_at = $4
      WHERE id = $5
    `, [
      progress,
      status,
      null,
      new Date().toISOString(),
      process_id
    ])

    return NextResponse.json({ progress, status })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
