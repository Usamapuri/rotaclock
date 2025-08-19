import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        display_name,
        description,
        permissions,
        dashboard_access,
        is_active,
        created_at,
        updated_at
      FROM roles 
      WHERE is_active = true
      ORDER BY name
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, display_name, description, permissions, dashboard_access } = await request.json()

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'Name and display name are required' },
        { status: 400 }
      )
    }

    const result = await query(`
      INSERT INTO roles (
        name,
        display_name,
        description,
        permissions,
        dashboard_access
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      name,
      display_name,
      description || '',
      JSON.stringify(permissions || {}),
      JSON.stringify(dashboard_access || [])
    ])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}
