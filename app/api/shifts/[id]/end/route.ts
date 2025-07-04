import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

/**
 * POST /api/shifts/[id]/end
 * End a shift
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if shift exists and get current status
    const { data: shift, error: fetchError } = await supabase
      .from('shifts')
      .select('id, status, employee_id, start_time, end_time')
      .eq('id', id)
      .single()

    if (fetchError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    // Check if user is the employee assigned to this shift
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (employeeError || !employee || employee.id !== shift.employee_id) {
      return NextResponse.json({ error: 'You can only end your own shifts' }, { status: 403 })
    }

    // Validate shift status
    if (shift.status !== 'in-progress') {
      return NextResponse.json({ 
        error: `Cannot end shift with status: ${shift.status}` 
      }, { status: 400 })
    }

    // End the shift
    const { data: updatedShift, error: updateError } = await supabase
      .from('shifts')
      .update({ 
        status: 'completed',
        end_time: new Date().toISOString() // Update actual end time
      })
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, first_name, last_name, email)
      `)
      .single()

    if (updateError) {
      console.error('Error ending shift:', updateError)
      return NextResponse.json({ error: 'Failed to end shift' }, { status: 500 })
    }

    return NextResponse.json({ 
      shift: updatedShift,
      message: 'Shift ended successfully' 
    })

  } catch (error) {
    console.error('Error in POST /api/shifts/[id]/end:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 