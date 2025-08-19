const { Pool } = require('pg')

const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkWeeklyAssignments() {
  try {
    console.log('Checking weekly shift assignments...')
    
    // Get current week dates
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }
    
    console.log('Current week dates:', weekDates)
    
    // Check assignments for the current week
    const weekStart = weekDates[0]
    const weekEnd = weekDates[6]
    
    console.log(`\nChecking assignments from ${weekStart} to ${weekEnd}`)
    
    const assignmentsResult = await pool.query(`
      SELECT 
        sa.id,
        sa.date,
        sa.status,
        sa.start_time,
        sa.end_time,
        e.first_name,
        e.last_name,
        e.email,
        s.name as shift_name
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id
      JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= $1 AND sa.date <= $2
      ORDER BY sa.date, e.first_name
    `, [weekStart, weekEnd])
    
    console.log(`\nFound ${assignmentsResult.rows.length} assignments for the current week:`)
    
    if (assignmentsResult.rows.length === 0) {
      console.log('No assignments found for the current week!')
      return
    }
    
    // Group by date
    const assignmentsByDate = {}
    assignmentsResult.rows.forEach(assignment => {
      const date = assignment.date
      if (!assignmentsByDate[date]) {
        assignmentsByDate[date] = []
      }
      assignmentsByDate[date].push(assignment)
    })
    
    // Display assignments by date
    Object.keys(assignmentsByDate).sort().forEach(date => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' })
      console.log(`\n${dayName} (${date}):`)
      
      assignmentsByDate[date].forEach(assignment => {
        console.log(`  - ${assignment.first_name} ${assignment.last_name} (${assignment.email})`)
        console.log(`    Shift: ${assignment.shift_name} (${assignment.start_time} - ${assignment.end_time})`)
        console.log(`    Status: ${assignment.status}`)
        console.log(`    ID: ${assignment.id}`)
        console.log('')
      })
    })
    
    // Check status distribution
    const statusCounts = {}
    assignmentsResult.rows.forEach(assignment => {
      statusCounts[assignment.status] = (statusCounts[assignment.status] || 0) + 1
    })
    
    console.log('\nStatus distribution:')
    Object.keys(statusCounts).forEach(status => {
      console.log(`  ${status}: ${statusCounts[status]}`)
    })
    
    // Check if there are any confirmed assignments (which should be swappable)
    const confirmedAssignments = assignmentsResult.rows.filter(a => a.status === 'confirmed')
    console.log(`\nConfirmed assignments (swappable): ${confirmedAssignments.length}`)
    
    if (confirmedAssignments.length > 0) {
      console.log('\nConfirmed assignments:')
      confirmedAssignments.forEach(assignment => {
        console.log(`  - ${assignment.first_name} ${assignment.last_name}: ${assignment.shift_name} on ${assignment.date}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking weekly assignments:', error)
  } finally {
    await pool.end()
  }
}

checkWeeklyAssignments()
