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

const createPayrollPeriod = async () => {
  try {
    console.log('🔄 Creating payroll period...')
    
    // Create a payroll period for the last 7 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    
    const result = await query(`
      INSERT INTO payroll_periods (
        period_name,
        start_date,
        end_date,
        status,
        total_employees,
        total_payroll_amount
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      'Test Period - Last 7 Days',
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      'open',
      0,
      0
    ])
    
    console.log('✅ Payroll period created successfully!')
    console.log('📊 Period details:')
    console.log(`   ID: ${result.rows[0].id}`)
    console.log(`   Name: ${result.rows[0].period_name}`)
    console.log(`   Start: ${result.rows[0].start_date}`)
    console.log(`   End: ${result.rows[0].end_date}`)
    console.log(`   Status: ${result.rows[0].status}`)
    
  } catch (error) {
    console.error('❌ Error creating payroll period:', error)
  } finally {
    await pool.end()
  }
}

createPayrollPeriod()
