import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const processResult = await query(`
      SELECT * FROM onboarding_processes WHERE id = $1
    `, [id])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    // Get step completions for this process
    const completionsResult = await query(`
      SELECT step_id, completed_at, feedback, completed_by
      FROM step_completions 
      WHERE process_id = $1
    `, [id])

    const stepCompletions = completionsResult.rows

    // Get template steps
    const stepsResult = await query(`
      SELECT * FROM onboarding_steps
      WHERE template_id = $1
      ORDER BY step_order
    `, [process.template_id])

    const steps = stepsResult.rows

    return NextResponse.json({ 
      process: { ...process, step_completions: stepCompletions }, 
      steps 
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Build update query dynamically
    const updateFields = Object.keys(body).map((key, index) => `${key} = $${index + 2}`).join(', ')
    const updateValues = Object.values(body)

    const processResult = await query(`
      UPDATE onboarding_processes
      SET ${updateFields}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, ...updateValues])

    if (processResult.rows.length === 0) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 })
    }

    const process = processResult.rows[0]

    return NextResponse.json({ data: process })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
