import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: processes, error } = await supabase
      .from("onboarding_processes")
      .select(`
        *,
        step_completions (
          step_id,
          completed_at,
          feedback
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching processes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ processes })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { employee_id, employee_name, template_id, template_name, start_date, assigned_mentor, notes } = body

    // Calculate expected completion date (assuming 5 business days)
    const startDate = new Date(start_date)
    const expectedCompletionDate = new Date(startDate)
    expectedCompletionDate.setDate(startDate.getDate() + 5)

    const { data: process, error } = await supabase
      .from("onboarding_processes")
      .insert({
        employee_id,
        employee_name,
        template_id,
        template_name,
        start_date,
        expected_completion_date: expectedCompletionDate.toISOString().split("T")[0],
        assigned_mentor,
        notes,
        status: "not-started",
        progress: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating process:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ process })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
