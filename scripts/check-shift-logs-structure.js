const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkShiftLogsStructure() {
  try {
    console.log('🔍 Checking shift_logs table structure...\n')
    
    // Check table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'shift_logs' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Shift logs table columns:')
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    
    // Check sample data
    console.log('\n📊 Sample shift logs data:')
    const sampleResult = await pool.query(`
      SELECT 
        employee_id,
        clock_in_time,
        clock_out_time,
        total_shift_hours,
        is_late,
        is_no_show,
        performance_rating,
        status
      FROM shift_logs 
      LIMIT 3
    `)
    
    sampleResult.rows.forEach((row, index) => {
      console.log(`   Record ${index + 1}:`)
      console.log(`     Employee ID: ${row.employee_id}`)
      console.log(`     Clock in: ${row.clock_in_time}`)
      console.log(`     Clock out: ${row.clock_out_time}`)
      console.log(`     Hours: ${row.total_shift_hours}`)
      console.log(`     Is late: ${row.is_late}`)
      console.log(`     Is no-show: ${row.is_no_show}`)
      console.log(`     Performance: ${row.performance_rating}`)
      console.log(`     Status: ${row.status}`)
    })
    
    // Check employee IDs in shift_logs
    console.log('\n👥 Employee IDs in shift_logs:')
    const employeeIdsResult = await pool.query(`
      SELECT DISTINCT employee_id, COUNT(*) as shift_count
      FROM shift_logs
      GROUP BY employee_id
      ORDER BY shift_count DESC
    `)
    
    employeeIdsResult.rows.forEach(row => {
      console.log(`   ${row.employee_id}: ${row.shift_count} shifts`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkShiftLogsStructure()
