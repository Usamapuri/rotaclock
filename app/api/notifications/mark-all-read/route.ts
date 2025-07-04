import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all unread notifications as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (updateError) {
      console.error('Error updating notifications:', updateError)
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'All notifications marked as read' 
    })

  } catch (error) {
    console.error('Error in PATCH /api/notifications/mark-all-read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 