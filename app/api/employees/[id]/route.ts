import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const result = await query(`
      SELECT 
        id,
        employee_code as employee_id,
        first_name,
        last_name,
        email,
        department,
        job_position as position,
        hire_date,
        hourly_rate::numeric,
        is_active,
        is_online,
        last_online
      FROM employees_new
      WHERE id = $1
    `, [id])
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Employee GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}

import { z } from 'zod'

// Validation schema for employee updates
const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  department: z.string().min(1).optional(),
  position: z.string().min(1).optional(),
  hourly_rate: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  max_hours_per_week: z.number().positive().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeId = params.id
    const body = await request.json()
    
    // Validate the request body
    const validatedData = updateEmployeeSchema.parse(body)
    
      // Check if employee exists
      const checkQuery = 'SELECT * FROM employees WHERE id = $1'
      const checkResult = await query(checkQuery, [employeeId])
      
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
      
      if (validatedData.position !== undefined) {
        updateFields.push(`position = $${paramCount}`)
        updateValues.push(validatedData.position)
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

export async function LEGACY_GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employeeIdParam = params.id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeIdParam)
    
    const queryText = `
      SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.hire_date,
        e.hourly_rate,
        e.is_active,
        e.is_online,
        e.last_online,
        e.role,
        r.display_name as role_display_name,
        r.description as role_description,
        r.permissions as role_permissions,
        r.dashboard_access as role_dashboard_access,
        e.team_id,
        e.manager_id,
        e.max_hours_per_week,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT sa.id) as total_assignments,
        COUNT(DISTINCT te.id) as total_time_entries,
        COALESCE(SUM(te.total_hours), 0) as total_hours_worked
      FROM employees e
      LEFT JOIN roles r ON e.role = r.name
      LEFT JOIN shift_assignments sa ON e.id = sa.employee_id
      LEFT JOIN time_entries te ON e.id = te.employee_id
      WHERE ${isUuid ? 'e.id' : 'e.employee_id'} = $1
      GROUP BY e.id, e.employee_id, e.first_name, e.last_name, e.email, e.department, e.position, e.hire_date, e.hourly_rate, e.is_active, e.is_online, e.last_online, e.role, r.display_name, r.description, r.permissions, r.dashboard_access, e.team_id, e.manager_id, e.max_hours_per_week, e.created_at, e.updated_at
    `
    
    const result = await query(queryText, [employeeIdParam])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ data: result.rows[0] })
    
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}