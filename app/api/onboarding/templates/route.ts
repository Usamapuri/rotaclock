import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const templatesResult = await query(`
      SELECT 
        *,
        (
          SELECT json_agg(
            json_build_object(
              'id', os.id,
              'name', os.name,
              'description', os.description,
              'step_order', os.step_order,
              'estimated_time', os.estimated_time,
              'is_required', os.is_required,
              'template_id', os.template_id,
              'created_at', os.created_at,
              'updated_at', os.updated_at
            )
          )
          FROM onboarding_steps os
          WHERE os.template_id = ot.id
          ORDER BY os.step_order
        ) as onboarding_steps
      FROM onboarding_templates ot
      WHERE ot.is_active = true
      ORDER BY ot.created_at DESC
    `)

    return NextResponse.json({ templates: templatesResult.rows })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, description, department, steps } = body

    // Calculate total estimated time
    const totalEstimatedTime = steps?.reduce((total: number, step: any) => total + (step.estimated_time || 0), 0) || 0

    // Insert template
    const templateResult = await query(`
      INSERT INTO onboarding_templates (name, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, description, true])

    const template = templateResult.rows[0]

    // Insert steps if provided
    if (steps && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        await query(`
          INSERT INTO onboarding_steps (name, description, step_order, estimated_time, is_required, template_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [step.name, step.description, i + 1, step.estimated_time || 0, step.is_required || false, template.id])
      }
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
