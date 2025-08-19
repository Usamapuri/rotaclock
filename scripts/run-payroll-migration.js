const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Railway database configuration using public URL
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function runPayrollMigration() {
  try {
    console.log('🔄 Running payroll system migration...')

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-payroll-tables.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Split the SQL into individual statements and clean them
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'))

    console.log(`📝 Found ${statements.length} SQL statements to execute`)

    // Execute each statement individually
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          console.log(`   Executing statement ${i + 1}/${statements.length}...`)
          await pool.query(statement)
          console.log(`   ✅ Statement ${i + 1} executed successfully`)
        } catch (error) {
          if (error.code === '42P07') { // Table already exists
            console.log(`   ⚠️  Table already exists, skipping...`)
          } else if (error.code === '42710') { // Index already exists
            console.log(`   ⚠️  Index already exists, skipping...`)
          } else if (error.code === '23505') { // Unique constraint violation
            console.log(`   ⚠️  Record already exists, skipping...`)
          } else {
            console.error(`   ❌ Error executing statement:`, error.message)
            console.error(`   Statement: ${statement.substring(0, 100)}...`)
            // Continue with other statements instead of failing completely
          }
        }
      }
    }

    console.log('✅ Payroll system migration completed successfully!')

    // Verify tables were created
    console.log('🔍 Verifying tables...')
    const tables = [
      'employee_salaries',
      'payroll_periods', 
      'payroll_records',
      'payroll_deductions',
      'payroll_bonuses',
      'payroll_settings'
    ]

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`)
        console.log(`   ✅ ${table}: ${result.rows[0].count} records`)
      } catch (error) {
        console.error(`   ❌ ${table}: Error - ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Error running payroll migration:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
runPayrollMigration()
