import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let queryText = `
      SELECT 
        id,
        employee_code,
        first_name,
        last_name,
        email,
        department,
        job_position,
        is_active,
        hourly_rate,
        max_hours_per_week
      FROM employees_new
      WHERE is_active = true
    `
    const params: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      queryText += ` AND (
        LOWER(first_name) LIKE LOWER($${paramIndex}) OR
        LOWER(last_name) LIKE LOWER($${paramIndex}) OR
        LOWER(employee_code) LIKE LOWER($${paramIndex}) OR
        LOWER(email) LIKE LOWER($${paramIndex})
      )`
      params.push(`%${search}%`)
      paramIndex++
    }

    // Add department filter
    if (department) {
      queryText += ` AND department = $${paramIndex}`
      params.push(department)
      paramIndex++
    }

    // Add ordering and pagination
    queryText += ` ORDER BY first_name, last_name LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM employees_new
      WHERE is_active = true
    `
    const countParams: any[] = []
    let countParamIndex = 1

    if (search) {
      countQuery += ` AND (
        LOWER(first_name) LIKE LOWER($${countParamIndex}) OR
        LOWER(last_name) LIKE LOWER($${countParamIndex}) OR
        LOWER(employee_code) LIKE LOWER($${countParamIndex}) OR
        LOWER(email) LIKE LOWER($${countParamIndex})
      )`
      countParams.push(`%${search}%`)
      countParamIndex++
    }

    if (department) {
      countQuery += ` AND department = $${countParamIndex}`
      countParams.push(department)
    }

    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
