import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const documentsResult = await query(`
      SELECT * FROM onboarding_documents
      ORDER BY created_at DESC
    `)

    return NextResponse.json({ documents: documentsResult.rows })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, type, file_url, required, uploaded_by } = body

    const documentResult = await query(`
      INSERT INTO onboarding_documents (name, type, file_url, required, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, type, file_url, required, uploaded_by])

    return NextResponse.json({ document: documentResult.rows[0] })
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
