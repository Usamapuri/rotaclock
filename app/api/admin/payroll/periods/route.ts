import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

export async function GET(request: NextRequest) {
  try {
    // Authentication and tenant context
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const result = await query(`
      SELECT 
        id,
        period_name,
        start_date,
        end_date,
        status,
        total_employees,
        total_payroll_amount,
        created_at,
        updated_at
      FROM payroll_periods
      WHERE tenant_id = $1
      ORDER BY start_date DESC
    `, [tenantContext.tenant_id])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payroll periods' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication and tenant context
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant context
    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json(
        { success: false, error: 'No tenant context found' },
        { status: 403 }
      )
    }

    const { period_name, start_date, end_date } = await request.json()

    if (!period_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Period name, start date, and end date are required' },
        { status: 400 }
      )
    }

    const result = await query(`
      INSERT INTO payroll_periods (
        period_name, start_date, end_date, status, tenant_id, organization_id
      ) VALUES ($1, $2, $3, 'open', $4, $5)
      RETURNING *
    `, [period_name, start_date, end_date, tenantContext.tenant_id, tenantContext.organization_id])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating payroll period:', error)
    return NextResponse.json(
      { error: 'Failed to create payroll period' },
      { status: 500 }
    )
  }
}
