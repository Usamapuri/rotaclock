import { NextRequest, NextResponse } from 'next/server'
import { query, getTeamByLead } from '@/lib/database'
import { createApiAuthMiddleware, isTeamLead } from '@/lib/api-auth'
import { z } from 'zod'

const createRequestSchema = z.object({
  type: z.enum(['dock', 'bonus']),
  employee_id: z.string().uuid('Invalid employee ID'),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  additional_notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }
    
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const employee_id = searchParams.get('employee_id')
    
    let queryText = `
      SELECT 
        tr.id,
        tr.type,
        tr.amount,
        tr.reason,
        tr.effective_date,
        tr.additional_notes,
        tr.status,
        tr.admin_notes,
        tr.created_at,
        tr.updated_at,
        e.first_name,
        e.last_name,
        e.email,
        e.employee_id as emp_id,
        a.first_name as admin_first_name,
        a.last_name as admin_last_name,
        a.email as admin_email
      FROM team_requests tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      LEFT JOIN employees a ON tr.reviewed_by = a.id
      WHERE tr.team_lead_id = $1 AND e.team_id = $2
    `
    
    const queryParams: any[] = [user!.id, team.id]
    let paramIndex = 3
    
    if (type) {
      queryText += ` AND tr.type = $${paramIndex}`
      queryParams.push(type)
      paramIndex++
    }
    
    if (status) {
      queryText += ` AND tr.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }
    
    if (employee_id) {
      queryText += ` AND tr.employee_id = $${paramIndex}`
      queryParams.push(employee_id)
      paramIndex++
    }
    
    queryText += ` ORDER BY tr.created_at DESC`
    
    const result = await query(queryText, queryParams)
    
    return NextResponse.json({ 
      success: true, 
      data: result.rows,
      team: {
        id: team.id,
        name: team.name,
        department: team.department
      }
    })
  } catch (error) {
    console.error('Error in GET /api/team-lead/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!isTeamLead(user)) {
      return NextResponse.json({ error: 'Forbidden: Only team leads can access this endpoint' }, { status: 403 })
    }
    
    const team = await getTeamByLead(user!.id)
    if (!team) {
      return NextResponse.json({ error: 'No team found for this team lead' }, { status: 404 })
    }
    
    const body = await request.json()
    const validationResult = createRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { status: 400 })
    }
    
    const { 
      type, 
      employee_id, 
      amount, 
      reason, 
      effective_date, 
      additional_notes 
    } = validationResult.data
    
    // Verify the employee belongs to the team lead's team
    const employeeResult = await query(`
      SELECT id, first_name, last_name, email
      FROM employees 
      WHERE id = $1 AND team_id = $2 AND is_active = true
    `, [employee_id, team.id])
    
    if (employeeResult.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Employee not found or does not belong to your team' 
      }, { status: 404 })
    }
    
    const employee = employeeResult.rows[0]
    
    // Create the request
    const requestId = crypto.randomUUID()
    const result = await query(`
      INSERT INTO team_requests (
        id, team_lead_id, team_id, employee_id, type, amount, reason, 
        effective_date, additional_notes, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      requestId,
      user!.id,
      team.id,
      employee_id,
      type,
      amount,
      reason,
      effective_date,
      additional_notes || null,
      'pending',
      new Date().toISOString(),
      new Date().toISOString()
    ])
    
    const newRequest = result.rows[0]
    
    // Create notification for admin
    await query(`
      INSERT INTO notifications (
        user_id, title, message, type, related_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'admin', // This will be sent to all admins
      `${type.charAt(0).toUpperCase() + type.slice(1)} Request`,
      `${team.name} team lead has submitted a ${type} request for ${employee.first_name} ${employee.last_name}`,
      'team_request',
      requestId,
      new Date().toISOString()
    ])
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ...newRequest,
        employee: {
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email
        }
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} request submitted successfully`
    })
    
  } catch (error) {
    console.error('Error in POST /api/team-lead/requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
