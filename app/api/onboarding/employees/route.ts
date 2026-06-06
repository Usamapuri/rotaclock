import { type NextRequest, NextResponse } from "next/server"
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { query } from "@/lib/database"
import { getTenantContext } from "@/lib/tenant"

async function _GET(request: NextRequest) {
  try {
    const { user, isAuthenticated } = await createApiAuthMiddleware()(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }
    const employeesResult = await query(`
      SELECT * FROM employees
      WHERE is_active = true AND tenant_id = $1
      ORDER BY created_at DESC
    `, [tenantContext.tenant_id])

    return NextResponse.json({ employees: employeesResult.rows })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function _POST(request: NextRequest) {
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

    const { employee_id, first_name, last_name, email, department, job_position, hire_date, manager_id } = body

    const employeeResult = await query(`
      INSERT INTO employees (employee_id, first_name, last_name, email, department, job_position, hire_date, manager_id, is_active, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [employee_id, first_name, last_name, email, department, job_position, hire_date, manager_id, true, tenantContext.tenant_id])

    return NextResponse.json({ employee: employeeResult.rows[0] })
  } catch (error) {
    console.error("Error creating employee:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
export const POST = withRlsTenant(_POST)
