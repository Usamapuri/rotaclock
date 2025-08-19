const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

const createSampleShiftLogs = async () => {
  try {
    console.log('🔄 Creating sample shift logs...')
    
    // Get all active employees
    const employeesResult = await query(`
      SELECT id, employee_id, first_name, last_name 
      FROM employees 
      WHERE is_active = true 
      LIMIT 5
    `)
    
    const employees = employeesResult.rows
    console.log(`Found ${employees.length} employees`)
    
    // Create shift logs for the last 7 days
    for (const employee of employees) {
      console.log(`Creating shift logs for ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
      
      for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        // Create a shift log for each day
        const clockInTime = new Date(date)
        clockInTime.setHours(9, 0, 0, 0) // 9 AM start
        
        const clockOutTime = new Date(date)
        clockOutTime.setHours(17, 0, 0, 0) // 5 PM end
        
        // Calculate total hours (8 hours minus 1 hour break)
        const totalHours = 7.0
        
        // Random performance rating (3-5)
        const performanceRating = Math.floor(Math.random() * 3) + 3
        
        // Random lateness (10% chance of being late)
        const isLate = Math.random() < 0.1
        const lateMinutes = isLate ? Math.floor(Math.random() * 30) + 5 : 0
        
        await query(`
          INSERT INTO shift_logs (
            employee_id,
            clock_in_time,
            clock_out_time,
            total_shift_hours,
            break_time_used,
            max_break_allowed,
            is_late,
            is_no_show,
            late_minutes,
            status,
            performance_rating,
            total_calls_taken,
            leads_generated,
            shift_remarks
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
          employee.id,
          clockInTime.toISOString(),
          clockOutTime.toISOString(),
          totalHours,
          1.0, // 1 hour break
          1.0, // 1 hour max break
          isLate,
          false, // no no-shows for now
          lateMinutes,
          'completed',
          performanceRating,
          Math.floor(Math.random() * 50) + 20, // 20-70 calls
          Math.floor(Math.random() * 10) + 1,  // 1-10 leads
          `Regular shift for ${employee.first_name}`
        ])
      }
    }
    
    console.log('✅ Sample shift logs created successfully!')
    console.log(`📊 Created ${employees.length * 7} shift logs`)
    
    // Show summary
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN is_late = true THEN 1 END) as late_shifts,
        COUNT(CASE WHEN is_no_show = true THEN 1 END) as no_shows,
        AVG(performance_rating) as avg_performance,
        SUM(total_shift_hours) as total_hours
      FROM shift_logs
      WHERE status = 'completed'
    `)
    
    const summary = summaryResult.rows[0]
    console.log('\n📈 Shift Logs Summary:')
    console.log(`   Total logs: ${summary.total_logs}`)
    console.log(`   Late shifts: ${summary.late_shifts}`)
    console.log(`   No-shows: ${summary.no_shows}`)
    console.log(`   Avg performance: ${summary.avg_performance?.toFixed(2)}`)
    console.log(`   Total hours: ${summary.total_hours?.toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ Error creating sample shift logs:', error)
  } finally {
    await pool.end()
  }
}

createSampleShiftLogs()
