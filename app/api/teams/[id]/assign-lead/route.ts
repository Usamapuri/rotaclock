import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const team_lead_id = body?.team_lead_id
    
    if (!team_lead_id) {
      return NextResponse.json({ error: 'team_lead_id is required' }, { status: 400 })
    }

    // Verify the team exists
    const teamCheck = await query(
      'SELECT id FROM teams WHERE id = $1 AND is_active = true',
      [id]
    )

    if (teamCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify the employee is a team lead
    const leadCheck = await query(
      'SELECT id, role FROM employees WHERE id = $1 AND role = $2 AND is_active = true',
      [team_lead_id, 'team_lead']
    )

    if (leadCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found or not a team lead' },
        { status: 400 }
      )
    }

    // Update the team with the new team lead
    const result = await query(
      'UPDATE teams SET team_lead_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [team_lead_id, id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Team lead assigned successfully'
    })

  } catch (error) {
    console.error('Error assigning team lead:', error)
    return NextResponse.json(
      { error: 'Failed to assign team lead' },
      { status: 500 }
    )
  }
}


