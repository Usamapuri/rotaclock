import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { process_id, step_id, rating, feedback_text, feedback_type, submitted_by } = body

    const { data: feedback, error } = await supabase
      .from("onboarding_feedback")
      .insert({
        process_id,
        step_id,
        rating,
        feedback_text,
        feedback_type,
        submitted_by,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating feedback:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const processId = searchParams.get("process_id")

    let query = supabase
      .from("onboarding_feedback")
      .select(`
        *,
        onboarding_processes (employee_name),
        onboarding_steps (title)
      `)
      .order("created_at", { ascending: false })

    if (processId) {
      query = query.eq("process_id", processId)
    }

    const { data: feedback, error } = await query

    if (error) {
      console.error("Error fetching feedback:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
