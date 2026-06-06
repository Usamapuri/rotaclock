import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, withRlsTenant } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'

/** Cache column lists so older DBs without address / extended fields still work */
let tableColumnsCache: { employees: Set<string>; roles: Set<string>; at: number } | null = null
const TABLE_COLUMNS_TTL_MS = 5 * 60 * 1000

async function getEmployeesAndRolesColumns(): Promise<{ employees: Set<string>; roles: Set<string> }> {
  const now = Date.now()
  if (tableColumnsCache && now - tableColumnsCache.at < TABLE_COLUMNS_TTL_MS) {
    return { employees: tableColumnsCache.employees, roles: tableColumnsCache.roles }
  }
  const r = await query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name IN ('employees', 'roles')`
  )
  const employees = new Set<string>()
  const roles = new Set<string>()
  for (const row of r.rows as { table_name: string; column_name: string }[]) {
    if (row.table_name === 'employees') employees.add(row.column_name)
    else if (row.table_name === 'roles') roles.add(row.column_name)
  }
  tableColumnsCache = { employees, roles, at: now }
  return { employees, roles }
}

function ec(employees: Set<string>, col: string, defaultSql: string): string {
  return employees.has(col) ? `e.${col}` : defaultSql
}

async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenant = await getTenantContext(user.id)
    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { id } = await params
    const { employees: emp, roles: rls } = await getEmployeesAndRolesColumns()

    const roleDisplaySql = rls.has('display_name')
      ? 'COALESCE(r.display_name::text, r.name::text, e.role::text)'
      : 'COALESCE(r.name::text, e.role::text)'
    const roleDescSql = rls.has('description') ? 'r.description' : 'NULL::text'

    const tenantJoin =
      emp.has('tenant_id') && rls.has('tenant_id') ? 'AND r.tenant_id = e.tenant_id' : ''
    const roleJoinSql = `LEFT JOIN roles r ON e.role = r.name ${tenantJoin}`

    const locJoinSql = emp.has('location_id')
      ? 'LEFT JOIN locations l ON e.location_id = l.id AND l.tenant_id = e.tenant_id'
      : ''
    const locationNameSql = emp.has('location_id') ? 'l.name' : 'NULL::text'

    const sql = `
      SELECT 
        e.id,
        ${ec(emp, 'employee_code', 'NULL::text')} AS employee_id,
        ${ec(emp, 'first_name', 'NULL::text')} AS first_name,
        ${ec(emp, 'last_name', 'NULL::text')} AS last_name,
        ${ec(emp, 'email', 'NULL::text')} AS email,
        ${ec(emp, 'department', 'NULL::text')} AS department,
        ${ec(emp, 'job_position', 'NULL::text')} AS position,
        ${ec(emp, 'role', 'NULL::text')} AS role,
        ${ec(emp, 'hire_date', 'NULL::date')} AS hire_date,
        ${ec(emp, 'manager_id', 'NULL::uuid')} AS manager_id,
        ${ec(emp, 'team_id', 'NULL::uuid')} AS team_id,
        ${ec(emp, 'hourly_rate', 'NULL::numeric')} AS hourly_rate,
        ${ec(emp, 'max_hours_per_week', 'NULL::integer')} AS max_hours_per_week,
        ${ec(emp, 'is_active', 'NULL::boolean')} AS is_active,
        ${ec(emp, 'is_online', 'NULL::boolean')} AS is_online,
        ${ec(emp, 'last_online', 'NULL::timestamptz')} AS last_online,
        ${ec(emp, 'phone', 'NULL::text')} AS phone,
        ${ec(emp, 'address', 'NULL::text')} AS address,
        ${ec(emp, 'emergency_contact', 'NULL::text')} AS emergency_contact,
        ${ec(emp, 'emergency_phone', 'NULL::text')} AS emergency_phone,
        ${ec(emp, 'notes', 'NULL::text')} AS notes,
        ${ec(emp, 'location_id', 'NULL::uuid')} AS location_id,
        ${ec(emp, 'created_at', 'NULL::timestamptz')} AS created_at,
        ${ec(emp, 'updated_at', 'NULL::timestamptz')} AS updated_at,
        ${roleDisplaySql} AS role_display_name,
        ${roleDescSql} AS role_description,
        ${locationNameSql} AS location_name,
        (SELECT COUNT(DISTINCT sa.id) FROM shift_assignments sa
          WHERE sa.employee_id = e.id AND sa.tenant_id = e.tenant_id) AS total_assignments,
        (SELECT COUNT(DISTINCT te.id) FROM time_entries te
          WHERE te.employee_id = e.id AND te.tenant_id = e.tenant_id) AS total_time_entries,
        (SELECT COALESCE(SUM(te.total_hours), 0) FROM time_entries te
          WHERE te.employee_id = e.id AND te.tenant_id = e.tenant_id) AS total_hours_worked
      FROM employees e
      ${roleJoinSql}
      ${locJoinSql}
      WHERE e.id = $1 AND e.tenant_id = $2
    `

    const result = await query(sql, [id, tenant.tenant_id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Error in GET /api/employees/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { z } from 'zod'

// Validation schema for employee updates
const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).nullable().optional().transform(val => val === null ? undefined : val),
  last_name: z.string().min(1).nullable().optional().transform(val => val === null ? undefined : val),
  email: z.string().email().nullable().optional().transform(val => val === null ? undefined : val),
  department: z.string().min(1).nullable().optional().transform(val => val === null ? undefined : val),
  job_position: z.string().min(1).nullable().optional().transform(val => val === null ? undefined : val),
  hourly_rate: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? undefined : num
  }).pipe(z.number().positive()).optional(),
  is_active: z.boolean().optional(),
  max_hours_per_week: z.union([z.string(), z.number()]).transform((val) => {
    if (val === null || val === undefined || val === '') return undefined
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? undefined : num
  }).pipe(z.number().positive()).optional(),
  phone: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  role: z.enum(['admin','manager','agent']).optional(),
  team_id: z.string().uuid().nullable().optional().transform(val => val === null ? undefined : val),
  manager_id: z.string().uuid().nullable().optional().transform(val => val === null ? undefined : val),
  address: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  emergency_contact: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  emergency_phone: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  notes: z.string().nullable().optional().transform(val => val === null ? undefined : val),
  location_id: z.string().uuid().nullable().optional().transform(val => val === null ? undefined : val),
})

async function _PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantContext = await getTenantContext(user.id)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No tenant context found' }, { status: 403 })
    }

    const { id: employeeId } = await params
    const body = await request.json()
    
    // Validate the request body
    const validatedData = updateEmployeeSchema.parse(body)
    
    // Check if employee exists within tenant
    const checkQuery = 'SELECT * FROM employees WHERE id = $1 AND tenant_id = $2'
    const checkResult = await query(checkQuery, [employeeId, tenantContext.tenant_id])
      
      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        )
      }
      
      const currentEmployee = checkResult.rows[0]
      
      // Build dynamic update query
      const updateFields: string[] = []
      const updateValues: any[] = []
      let paramCount = 1
      
      // Add fields to update
      if (validatedData.first_name !== undefined) {
        updateFields.push(`first_name = $${paramCount}`)
        updateValues.push(validatedData.first_name)
        paramCount++
      }
      
      if (validatedData.last_name !== undefined) {
        updateFields.push(`last_name = $${paramCount}`)
        updateValues.push(validatedData.last_name)
        paramCount++
      }
      
      if (validatedData.email !== undefined) {
        updateFields.push(`email = $${paramCount}`)
        updateValues.push(validatedData.email)
        paramCount++
      }
      
      if (validatedData.department !== undefined) {
        updateFields.push(`department = $${paramCount}`)
        updateValues.push(validatedData.department)
        paramCount++
      }
      
      if (validatedData.job_position !== undefined) {
        updateFields.push(`job_position = $${paramCount}`)
        updateValues.push(validatedData.job_position)
        paramCount++
      }
      
      if (validatedData.hourly_rate !== undefined) {
        updateFields.push(`hourly_rate = $${paramCount}`)
        updateValues.push(validatedData.hourly_rate)
        paramCount++
      }
      
      if (validatedData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount}`)
        updateValues.push(validatedData.is_active)
        paramCount++
      }
      
      if (validatedData.max_hours_per_week !== undefined) {
        updateFields.push(`max_hours_per_week = $${paramCount}`)
        updateValues.push(validatedData.max_hours_per_week)
        paramCount++
      }
      
      if (validatedData.phone !== undefined) {
        updateFields.push(`phone = $${paramCount}`)
        updateValues.push(validatedData.phone)
        paramCount++
      }
      
      if (validatedData.address !== undefined) {
        updateFields.push(`address = $${paramCount}`)
        updateValues.push(validatedData.address)
        paramCount++
      }
      
      if (validatedData.emergency_contact !== undefined) {
        updateFields.push(`emergency_contact = $${paramCount}`)
        updateValues.push(validatedData.emergency_contact)
        paramCount++
      }
      
      if (validatedData.emergency_phone !== undefined) {
        updateFields.push(`emergency_phone = $${paramCount}`)
        updateValues.push(validatedData.emergency_phone)
        paramCount++
      }
      
      if (validatedData.notes !== undefined) {
        updateFields.push(`notes = $${paramCount}`)
        updateValues.push(validatedData.notes)
        paramCount++
      }
      
      if (validatedData.role !== undefined) {
        updateFields.push(`role = $${paramCount}`)
        updateValues.push(validatedData.role)
        paramCount++
      }
      
      if (validatedData.team_id !== undefined) {
        updateFields.push(`team_id = $${paramCount}`)
        updateValues.push(validatedData.team_id)
        paramCount++
      }
      
      if (validatedData.manager_id !== undefined) {
        updateFields.push(`manager_id = $${paramCount}`)
        updateValues.push(validatedData.manager_id)
        paramCount++
      }

      if (validatedData.location_id !== undefined) {
        updateFields.push(`location_id = $${paramCount}`)
        updateValues.push(validatedData.location_id)
        paramCount++
      }
      
      // Add updated_at timestamp
      updateFields.push(`updated_at = NOW()`)
      
      // Add employee ID to values array
      updateValues.push(employeeId)
      
      // Execute update query
      const updateQuery = `
        UPDATE employees 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `
      
      const updateResult = await query(updateQuery, updateValues)
      const updatedEmployee = updateResult.rows[0]
      
      // Log department transfer if it occurred
      if (validatedData.department && validatedData.department !== currentEmployee.department) {
        console.log(`Employee ${updatedEmployee.first_name} ${updatedEmployee.last_name} transferred from ${currentEmployee.department} to ${validatedData.department}`)
      }
      
      // Log hourly rate change if it occurred
      if (validatedData.hourly_rate && validatedData.hourly_rate !== currentEmployee.hourly_rate) {
        console.log(`Employee ${updatedEmployee.first_name} ${updatedEmployee.last_name} hourly rate changed from $${currentEmployee.hourly_rate} to $${validatedData.hourly_rate}`)
      }
      
      return NextResponse.json({
        message: 'Employee updated successfully',
        data: updatedEmployee
      })
    
  } catch (error) {
    console.error('Error updating employee:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Tenant-scoped DB connection for RLS (see RLS_CUTOVER.md)
export const GET = withRlsTenant(_GET)
export const PUT = withRlsTenant(_PUT)
