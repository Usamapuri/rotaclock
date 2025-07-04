import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: process, error } = await supabase
      .from("onboarding_processes")
      .select(`
        *,
        step_completions (
          step_id,
          completed_at,
          feedback,
          completed_by
        )
      `)
      .eq("id", params.id)
      .single()

    if (error) {
      console.error("Error fetching process:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get template steps
    const { data: steps, error: stepsError } = await supabase
      .from("onboarding_steps")
      .select(`
        *,
        step_dependencies (
          depends_on_step_id
        ),
        step_documents (
          onboarding_documents (*)
        )
      `)
      .eq("template_id", process.template_id)
      .order("step_order")

    if (stepsError) {
      console.error("Error fetching steps:", stepsError)
      return NextResponse.json({ error: stepsError.message }, { status: 500 })
    }

    return NextResponse.json({ process, steps })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { data: process, error } = await supabase
      .from("onboarding_processes")
      .update(body)
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating process:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ process })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
