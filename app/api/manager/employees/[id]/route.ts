import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { getTenantContext } from '@/lib/tenant'
import { z } from 'zod'

// GET - Get single employee details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
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

    // Get employee details
    const employeeQuery = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.phone,
        e.role,
        e.department,
        e.job_position,
        e.hire_date,
        e.location_id,
        e.address,
        e.emergency_contact,
        e.emergency_phone,
        e.notes,
        e.hourly_rate,
        e.max_hours_per_week,
        e.is_active,
        l.name as location_name
      FROM employees e
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE e.id = $1 AND e.tenant_id = $2
    `
    const employeeResult = await query(employeeQuery, [employeeId, tenantContext.tenant_id])
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = employeeResult.rows[0]

    // Check if manager has access to employee's location
    if (employee.location_id) {
      const managerLocationCheck = await query(`
        SELECT 1 FROM manager_locations 
        WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
      `, [tenantContext.tenant_id, user.id, employee.location_id])

      if (managerLocationCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only view employees in your assigned locations.' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: employee
    })

  } catch (error) {
    console.error('Error fetching employee details:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update employee details (including location reassignment)
const updateEmployeeSchema = z.object({
  location_id: z.string().uuid().optional(),
  department: z.string().optional(),
  job_position: z.string().optional(),
  notes: z.string().optional(),
  hourly_rate: z.number().optional(),
  max_hours_per_week: z.number().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: employeeId } = await params
    
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (user.role !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Manager role required.' },
        { status: 403 }
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

    const body = await request.json()
    const validatedData = updateEmployeeSchema.parse(body)

    // Get current employee details
    const employeeQuery = `
      SELECT id, location_id, first_name, last_name, email
      FROM employees
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `
    const employeeResult = await query(employeeQuery, [employeeId, tenantContext.tenant_id])
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found or inactive' },
        { status: 404 }
      )
    }

    const currentEmployee = employeeResult.rows[0]

    // Check if manager has access to current employee location
    if (currentEmployee.location_id) {
      const managerLocationCheck = await query(`
        SELECT 1 FROM manager_locations 
        WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
      `, [tenantContext.tenant_id, user.id, currentEmployee.location_id])

      if (managerLocationCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only update employees in your assigned locations.' },
          { status: 403 }
        )
      }
    }

    // If changing location, verify manager has access to target location
    if (validatedData.location_id && validatedData.location_id !== currentEmployee.location_id) {
      const targetLocationCheck = await query(`
        SELECT 1 FROM manager_locations 
        WHERE tenant_id = $1 AND manager_id = $2 AND location_id = $3
      `, [tenantContext.tenant_id, user.id, validatedData.location_id])

      if (targetLocationCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Access denied. You can only reassign employees to your assigned locations.' },
          { status: 403 }
        )
      }

      // Verify the target location exists and is active
      const locationCheck = await query(`
        SELECT id FROM locations 
        WHERE id = $1 AND tenant_id = $2 AND is_active = true
      `, [validatedData.location_id, tenantContext.tenant_id])

      if (locationCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Target location not found or inactive' },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (validatedData.location_id !== undefined) {
      fields.push(`location_id = $${paramIndex}`)
      params.push(validatedData.location_id)
      paramIndex++
    }

    if (validatedData.department !== undefined) {
      fields.push(`department = $${paramIndex}`)
      params.push(validatedData.department)
      paramIndex++
    }

    if (validatedData.job_position !== undefined) {
      fields.push(`job_position = $${paramIndex}`)
      params.push(validatedData.job_position)
      paramIndex++
    }

    if (validatedData.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`)
      params.push(validatedData.notes)
      paramIndex++
    }

    if (validatedData.hourly_rate !== undefined) {
      fields.push(`hourly_rate = $${paramIndex}`)
      params.push(validatedData.hourly_rate)
      paramIndex++
    }

    if (validatedData.max_hours_per_week !== undefined) {
      fields.push(`max_hours_per_week = $${paramIndex}`)
      params.push(validatedData.max_hours_per_week)
      paramIndex++
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`)

    // Add WHERE clause parameters
    params.push(employeeId, tenantContext.tenant_id)

    const updateQuery = `
      UPDATE employees
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING *
    `

    const updateResult = await query(updateQuery, params)

    // Create notification for employee if location changed
    if (validatedData.location_id && validatedData.location_id !== currentEmployee.location_id) {
      const newLocationResult = await query(
        'SELECT name FROM locations WHERE id = $1',
        [validatedData.location_id]
      )
      const newLocationName = newLocationResult.rows[0]?.name || 'Unknown'

      await query(`
        INSERT INTO notifications (tenant_id, user_id, title, message, type, read, action_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        tenantContext.tenant_id,
        employeeId,
        'Location Assignment Updated',
        `Your work location has been changed to: ${newLocationName}`,
        'info',
        false,
        '/employee/profile'
      ])
    }

    return NextResponse.json({
      success: true,
      data: updateResult.rows[0],
      message: 'Employee updated successfully'
    })

  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

