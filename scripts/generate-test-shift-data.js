const { Pool } = require('pg')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function generateTestShiftData() {
  try {
    console.log('🔄 Generating test shift data for payroll calculation...\n')

    // Get the current payroll period
    const periodResult = await pool.query(`
      SELECT * FROM payroll_periods 
      WHERE status = 'processing' 
      ORDER BY start_date DESC 
      LIMIT 1
    `)

    if (periodResult.rows.length === 0) {
      console.log('❌ No active payroll period found')
      return
    }

    const period = periodResult.rows[0]
    console.log(`📅 Using period: ${period.period_name}`)
    console.log(`   Start: ${period.start_date}, End: ${period.end_date}\n`)

    // Get active employees
    const employeesResult = await pool.query(`
      SELECT id, employee_code, first_name, last_name, hourly_rate
      FROM employees_new 
      WHERE is_active = true
      LIMIT 5
    `)

    if (employeesResult.rows.length === 0) {
      console.log('❌ No active employees found')
      return
    }

    console.log(`👥 Found ${employeesResult.rows.length} employees`)

    // Generate shift logs for each employee
    for (const employee of employeesResult.rows) {
      console.log(`\n📝 Generating shifts for ${employee.first_name} ${employee.last_name}...`)

      // Generate 5-7 shifts per employee in the period
      const numShifts = Math.floor(Math.random() * 3) + 5
      
      for (let i = 0; i < numShifts; i++) {
        // Random date within the period
        const startDate = new Date(period.start_date)
        const endDate = new Date(period.end_date)
        const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
        
        // Random shift hours (6-10 hours)
        const shiftHours = Math.floor(Math.random() * 4) + 6
        const clockInTime = new Date(randomDate)
        clockInTime.setHours(9, 0, 0, 0) // 9 AM start
        
        const clockOutTime = new Date(clockInTime)
        clockOutTime.setHours(clockInTime.getHours() + shiftHours)

        // Random performance rating (3-5)
        const performanceRating = Math.floor(Math.random() * 3) + 3

        // Calculate pay
        const hourlyRate = employee.hourly_rate || 500 // Default PKR 500/hour
        const totalPay = shiftHours * hourlyRate

        // Insert shift log
        await pool.query(`
          INSERT INTO shift_logs (
            employee_id,
            clock_in_time,
            clock_out_time,
            total_shift_hours,
            status,
            approval_status,
            approved_hours,
            approved_rate,
            total_pay,
            performance_rating,
            is_late,
            is_no_show
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          employee.id,
          clockInTime,
          clockOutTime,
          shiftHours,
          'completed',
          'approved',
          shiftHours,
          hourlyRate,
          totalPay,
          performanceRating,
          Math.random() > 0.8, // 20% chance of being late
          Math.random() > 0.95 // 5% chance of no-show
        ])

        console.log(`   ✅ Shift ${i + 1}: ${shiftHours}h, PKR ${totalPay}, Rating: ${performanceRating}`)
      }
    }

    console.log('\n🎉 Test shift data generated successfully!')
    console.log('💡 Now try calculating payroll again - you should see non-zero values.')

  } catch (error) {
    console.error('❌ Error generating test shift data:', error)
  }
}

generateTestShiftData().then(() => {
  console.log('\n✅ Script completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})
