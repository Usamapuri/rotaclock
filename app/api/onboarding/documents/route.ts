import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware } from "@/lib/api-auth"
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

export async function GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const documentsResult = await query(`
      SELECT * FROM onboarding_documents
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantContext.tenant_id])

    return NextResponse.json({ documents: documentsResult.rows })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const body = await request.json()

    const { name, type, file_url, required, uploaded_by } = body

    const documentResult = await query(`
      INSERT INTO onboarding_documents (name, type, file_url, required, uploaded_by, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, type, file_url, required, uploaded_by, tenantContext.tenant_id])

    return NextResponse.json({ document: documentResult.rows[0] })
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
