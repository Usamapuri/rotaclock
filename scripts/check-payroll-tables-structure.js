const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkPayrollTablesStructure() {
  try {
    console.log('🔍 Checking payroll tables structure...\n')
    
    const tables = ['payroll_deductions', 'payroll_bonuses']
    
    for (const table of tables) {
      console.log(`📋 ${table} table columns:`)
      
      const structureResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position
      `, [table])
      
      structureResult.rows.forEach(row => {
        console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
      
      // Check sample data
      const sampleResult = await pool.query(`SELECT * FROM ${table} LIMIT 2`)
      console.log(`\n📊 Sample ${table} data:`)
      if (sampleResult.rows.length > 0) {
        sampleResult.rows.forEach((row, index) => {
          console.log(`   Record ${index + 1}:`, row)
        })
      } else {
        console.log(`   No data in ${table}`)
      }
      
      console.log('\n' + '='.repeat(50) + '\n')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkPayrollTablesStructure()
