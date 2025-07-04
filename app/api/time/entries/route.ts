import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { createApiAuthMiddleware } from '@/lib/api-auth'

/**
 * GET /api/time/entries
 * Get time entries with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Use demo authentication
    const authMiddleware = createApiAuthMiddleware()
    const { user, isAuthenticated } = await authMiddleware(request)
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For demo purposes, use a mock employee
    const employee = {
      id: 'demo-employee-id',
      position: user.role === 'admin' ? 'admin' : 'employee'
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Check permissions - admins can view all, employees can only view their own
    const isAdmin = employee.position?.toLowerCase().includes('admin')
    const targetEmployeeId = employee_id || employee.id

    if (!isAdmin && targetEmployeeId !== employee.id) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        employee:employees(*),
        shift_assignment:shift_assignments(
          *,
          shift:shifts(*)
        )
      `, { count: 'exact' })

    // Apply filters
    query = query.eq('employee_id', targetEmployeeId)

    if (start_date) {
      query = query.gte('clock_in', start_date)
    }
    if (end_date) {
      query = query.lte('clock_in', end_date)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: timeEntries, error, count } = await query

    if (error) {
      console.error('Error fetching time entries:', error)
      return NextResponse.json({ error: 'Failed to fetch time entries' }, { status: 500 })
    }

    // Calculate summary statistics
    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0
    const completedEntries = timeEntries?.filter(entry => entry.status === 'completed').length || 0
    const inProgressEntries = timeEntries?.filter(entry => entry.status === 'in-progress').length || 0

    return NextResponse.json({
      data: timeEntries,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      summary: {
        total_hours: Math.round(totalHours * 100) / 100,
        completed_entries: completedEntries,
        in_progress_entries: inProgressEntries,
        total_entries: timeEntries?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/time/entries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 