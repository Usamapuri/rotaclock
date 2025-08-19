import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/database'
import { createApiAuthMiddleware, isAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const assignTeamSchema = z.object({
  project_id: z.string().uuid('Invalid project ID'),
  team_id: z.string().uuid('Invalid team ID')
})

export async function POST(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { project_id, team_id } = assignTeamSchema.parse(body)

    // Verify the project exists
    const projectCheck = await query(
      'SELECT id FROM projects WHERE id = $1 AND is_active = true',
      [project_id]
    )

    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 400 }
      )
    }

    // Verify the team exists
    const teamCheck = await query(
      'SELECT id FROM teams WHERE id = $1 AND is_active = true',
      [team_id]
    )

    if (teamCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 400 }
      )
    }

    // Check if team is already assigned to another project
    const existingAssignment = await query(
      'SELECT id FROM teams WHERE id = $1 AND project_id IS NOT NULL AND project_id != $2',
      [team_id, project_id]
    )

    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        { error: 'Team is already assigned to another project' },
        { status: 400 }
      )
    }

    // Assign team to project
    const result = await query(
      `UPDATE teams 
       SET project_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [project_id, team_id]
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Team assigned to project successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: error.errors[0].message 
      }, { status: 400 })
    }
    
    console.error('Error assigning team to project:', error)
    return NextResponse.json(
      { error: 'Failed to assign team to project' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = createApiAuthMiddleware()
    const { user, isAuthenticated } = await auth(request)
    if (!isAuthenticated || !isAdmin(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')
    const team_id = searchParams.get('team_id')

    if (!project_id || !team_id) {
      return NextResponse.json(
        { error: 'project_id and team_id are required' },
        { status: 400 }
      )
    }

    // Remove team from project
    const result = await query(
      `UPDATE teams 
       SET project_id = NULL, updated_at = NOW()
       WHERE id = $1 AND project_id = $2
       RETURNING *`,
      [team_id, project_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Team not found or not assigned to this project' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Team removed from project successfully'
    })

  } catch (error) {
    console.error('Error removing team from project:', error)
    return NextResponse.json(
      { error: 'Failed to remove team from project' },
      { status: 500 }
    )
  }
}
