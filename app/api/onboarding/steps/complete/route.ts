import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { process_id, step_id, completed_by, feedback } = body

    // Insert step completion
    const { data: completion, error: completionError } = await supabase
      .from("step_completions")
      .insert({
        process_id,
        step_id,
        completed_by,
        feedback,
      })
      .select()
      .single()

    if (completionError) {
      console.error("Error creating completion:", completionError)
      return NextResponse.json({ error: completionError.message }, { status: 500 })
    }

    // Get all steps for this template to calculate progress
    const { data: process, error: processError } = await supabase
      .from("onboarding_processes")
      .select("template_id")
      .eq("id", process_id)
      .single()

    if (processError) {
      console.error("Error fetching process:", processError)
      return NextResponse.json({ error: processError.message }, { status: 500 })
    }

    // Get total steps count
    const { count: totalSteps, error: stepsCountError } = await supabase
      .from("onboarding_steps")
      .select("*", { count: "exact", head: true })
      .eq("template_id", process.template_id)

    if (stepsCountError) {
      console.error("Error counting steps:", stepsCountError)
      return NextResponse.json({ error: stepsCountError.message }, { status: 500 })
    }

    // Get completed steps count
    const { count: completedSteps, error: completedCountError } = await supabase
      .from("step_completions")
      .select("*", { count: "exact", head: true })
      .eq("process_id", process_id)

    if (completedCountError) {
      console.error("Error counting completed steps:", completedCountError)
      return NextResponse.json({ error: completedCountError.message }, { status: 500 })
    }

    // Calculate progress
    const progress = totalSteps ? (completedSteps! / totalSteps) * 100 : 0
    const status = progress === 100 ? "completed" : progress > 0 ? "in-progress" : "not-started"

    // Update process progress
    const { error: updateError } = await supabase
      .from("onboarding_processes")
      .update({
        progress,
        status,
        actual_completion_date: progress === 100 ? new Date().toISOString().split("T")[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", process_id)

    if (updateError) {
      console.error("Error updating process:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ completion, progress, status })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
