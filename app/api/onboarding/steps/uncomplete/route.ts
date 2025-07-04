import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { process_id, step_id } = body

    // Delete step completion
    const { error: deleteError } = await supabase
      .from("step_completions")
      .delete()
      .eq("process_id", process_id)
      .eq("step_id", step_id)

    if (deleteError) {
      console.error("Error deleting completion:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Recalculate progress (same logic as complete endpoint)
    const { data: process, error: processError } = await supabase
      .from("onboarding_processes")
      .select("template_id")
      .eq("id", process_id)
      .single()

    if (processError) {
      console.error("Error fetching process:", processError)
      return NextResponse.json({ error: processError.message }, { status: 500 })
    }

    const { count: totalSteps, error: stepsCountError } = await supabase
      .from("onboarding_steps")
      .select("*", { count: "exact", head: true })
      .eq("template_id", process.template_id)

    if (stepsCountError) {
      console.error("Error counting steps:", stepsCountError)
      return NextResponse.json({ error: stepsCountError.message }, { status: 500 })
    }

    const { count: completedSteps, error: completedCountError } = await supabase
      .from("step_completions")
      .select("*", { count: "exact", head: true })
      .eq("process_id", process_id)

    if (completedCountError) {
      console.error("Error counting completed steps:", completedCountError)
      return NextResponse.json({ error: completedCountError.message }, { status: 500 })
    }

    const progress = totalSteps ? (completedSteps! / totalSteps) * 100 : 0
    const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"

    const { error: updateError } = await supabase
      .from("onboarding_processes")
      .update({
        progress,
        status,
        actual_completion_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", process_id)

    if (updateError) {
      console.error("Error updating process:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ progress, status })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
