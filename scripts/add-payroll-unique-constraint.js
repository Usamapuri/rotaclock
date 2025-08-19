const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function addPayrollUniqueConstraint() {
  try {
    console.log('🔧 Adding unique constraint to payroll_records table...\n')
    
    // Add unique constraint on (employee_id, payroll_period_id)
    await pool.query(`
      ALTER TABLE payroll_records 
      ADD CONSTRAINT payroll_records_employee_period_unique 
      UNIQUE (employee_id, payroll_period_id)
    `)
    
    console.log('✅ Unique constraint added successfully!')
    
    // Verify the constraint was added
    const constraintResult = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'payroll_records' 
      AND constraint_type = 'UNIQUE'
    `)
    
    console.log('\n🔒 Current unique constraints:')
    constraintResult.rows.forEach(row => {
      console.log(`   - ${row.constraint_name}: ${row.constraint_type}`)
    })
    
    console.log('\n✅ Payroll records table is now ready for upsert operations!')
    
  } catch (error) {
    if (error.code === '42710') {
      console.log('✅ Unique constraint already exists')
    } else {
      console.error('❌ Error adding unique constraint:', error)
    }
  } finally {
    await pool.end()
  }
}

addPayrollUniqueConstraint()
