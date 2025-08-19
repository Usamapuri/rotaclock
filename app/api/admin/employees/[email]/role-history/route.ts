import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    const { email } = params

    const result = await query(`
      SELECT 
        id,
        employee_id,
        employee_email,
        old_role,
        new_role,
        assigned_by,
        reason,
        effective_date,
        created_at
      FROM role_assignments
      WHERE employee_email = $1
      ORDER BY created_at DESC
    `, [email])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching role history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role history' },
      { status: 500 }
    )
  }
}
