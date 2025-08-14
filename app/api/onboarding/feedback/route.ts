import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { process_id, step_id, rating, feedback_text, feedback_type, submitted_by } = body

    const feedbackResult = await query(`
      INSERT INTO onboarding_feedback (process_id, step_id, rating, feedback_text, feedback_type, submitted_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [process_id, step_id, rating, feedback_text, feedback_type, submitted_by])

    return NextResponse.json({ feedback: feedbackResult.rows[0] })
  } catch (error) {
    console.error("Error creating feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const processId = searchParams.get("process_id")

    let sql = `
      SELECT 
        of.*,
        json_build_object('employee_name', op.employee_name) as onboarding_processes,
        json_build_object('title', os.title) as onboarding_steps
      FROM onboarding_feedback of
      LEFT JOIN onboarding_processes op ON of.process_id = op.id
      LEFT JOIN onboarding_steps os ON of.step_id = os.id
    `

    const params: any[] = []
    if (processId) {
      sql += ` WHERE of.process_id = $1`
      params.push(processId)
    }

    sql += ` ORDER BY of.created_at DESC`

    const feedbackResult = await query(sql, params)

    return NextResponse.json({ feedback: feedbackResult.rows })
  } catch (error) {
    console.error("Error fetching feedback:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
