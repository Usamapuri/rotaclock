import { NextRequest, NextResponse } from 'next/server'
import { query, getTimeEntries } from '@/lib/database'
import { createApiAuthMiddleware } from '@/lib/api-auth'
import { z } from 'zod'

/**
 * GET /api/time/entries
 * Get time entries with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get('employee_id')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const status = searchParams.get('status')

    // Build filters
    const filters: any = {}
    if (employee_id) filters.employee_id = employee_id
    if (start_date) filters.start_date = start_date
    if (end_date) filters.end_date = end_date
    if (status) filters.status = status

    // Get time entries
    const entries = await getTimeEntries(filters)

    return NextResponse.json({
      data: entries
    })

  } catch (error) {
    console.error('Error in GET /api/time/entries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 