import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()

    const { data: templates, error } = await supabase
      .from("onboarding_templates")
      .select(`
        *,
        onboarding_steps (
          *,
          step_dependencies (
            depends_on_step_id
          ),
          step_documents (
            onboarding_documents (*)
          )
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching templates:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const body = await request.json()

    const { name, description, department, position, steps } = body

    // Calculate total estimated time
    const totalEstimatedTime = steps?.reduce((total: number, step: any) => total + (step.estimated_time || 0), 0) || 0

    // Insert template
    const { data: template, error: templateError } = await supabase
      .from("onboarding_templates")
      .insert({
        name,
        description,
        department,
        position,
        total_estimated_time: totalEstimatedTime,
        is_active: true,
      })
      .select()
      .single()

    if (templateError) {
      console.error("Error creating template:", templateError)
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    // Insert steps if provided
    if (steps && steps.length > 0) {
      const stepsWithTemplateId = steps.map((step: any, index: number) => ({
        ...step,
        template_id: template.id,
        step_order: index + 1,
      }))

      const { error: stepsError } = await supabase.from("onboarding_steps").insert(stepsWithTemplateId)

      if (stepsError) {
        console.error("Error creating steps:", stepsError)
        return NextResponse.json({ error: stepsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
