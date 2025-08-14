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

async function updateShiftStatus() {
  try {
    console.log('Updating shift assignments to confirmed status...')
    
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
    
    const weekStart = weekDates[0]
    const weekEnd = weekDates[6]
    
    console.log(`Updating assignments from ${weekStart} to ${weekEnd}`)
    
    // Update some assigned shifts to confirmed status
    // Focus on future dates (today and later) and specific employees
    const updateResult = await pool.query(`
      UPDATE shift_assignments 
      SET status = 'confirmed', updated_at = NOW()
      WHERE date >= $1 
        AND date <= $2 
        AND status = 'assigned'
        AND employee_id IN (
          SELECT id FROM employees 
          WHERE email IN (
            'john.doe@company.com',
            'jane.smith@company.com', 
            'mike.johnson@company.com',
            'sarah.wilson@company.com',
            'david.brown@company.com'
          )
        )
      RETURNING id, employee_id, date, status
    `, [weekStart, weekEnd])
    
    console.log(`Updated ${updateResult.rows.length} shift assignments to confirmed status`)
    
    if (updateResult.rows.length > 0) {
      console.log('\nUpdated assignments:')
      updateResult.rows.forEach(row => {
        console.log(`  - Assignment ID: ${row.id}, Employee: ${row.employee_id}, Date: ${row.date}`)
      })
    }
    
    // Show the current status distribution
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM shift_assignments 
      WHERE date >= $1 AND date <= $2
      GROUP BY status
      ORDER BY status
    `, [weekStart, weekEnd])
    
    console.log('\nCurrent status distribution:')
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`)
    })
    
    // Show some confirmed assignments for testing
    const confirmedResult = await pool.query(`
      SELECT 
        sa.id,
        sa.date,
        sa.status,
        e.first_name,
        e.last_name,
        e.email,
        s.name as shift_name
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id
      JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= $1 
        AND sa.date <= $2 
        AND sa.status = 'confirmed'
      ORDER BY sa.date, e.first_name
      LIMIT 10
    `, [weekStart, weekEnd])
    
    console.log(`\nSample confirmed assignments (${confirmedResult.rows.length} found):`)
    confirmedResult.rows.forEach(row => {
      console.log(`  - ${row.first_name} ${row.last_name}: ${row.shift_name} on ${row.date}`)
    })
    
  } catch (error) {
    console.error('Error updating shift status:', error)
  } finally {
    await pool.end()
  }
}

updateShiftStatus()
