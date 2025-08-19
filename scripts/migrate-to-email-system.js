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

const migrateToEmailSystem = async () => {
  try {
    console.log('🔄 Starting Email-Based System Migration...\n')
    
    // Step 1: Add email fields to related tables
    console.log('📝 Step 1: Adding email fields to related tables...')
    
    const tablesToUpdate = [
      'shift_logs',
      'payroll_records', 
      'payroll_bonuses',
      'payroll_deductions'
    ]
    
    for (const table of tablesToUpdate) {
      try {
        await query(`
          ALTER TABLE ${table} 
          ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255)
        `)
        console.log(`   ✅ Added employee_email to ${table}`)
      } catch (error) {
        console.log(`   ⚠️  employee_email already exists in ${table}`)
      }
    }
    
    // Step 2: Populate email fields
    console.log('\n📧 Step 2: Populating email fields...')
    
    // Update shift_logs
    await query(`
      UPDATE shift_logs 
      SET employee_email = e.email
      FROM employees e
      WHERE shift_logs.employee_id = e.id
    `)
    console.log('   ✅ Updated shift_logs with employee emails')
    
    // Update payroll_records
    await query(`
      UPDATE payroll_records 
      SET employee_email = e.email
      FROM employees e
      WHERE payroll_records.employee_id = e.employee_id
    `)
    console.log('   ✅ Updated payroll_records with employee emails')
    
    // Update payroll_bonuses
    await query(`
      UPDATE payroll_bonuses 
      SET employee_email = e.email
      FROM employees e
      WHERE payroll_bonuses.employee_id = e.employee_id
    `)
    console.log('   ✅ Updated payroll_bonuses with employee emails')
    
    // Update payroll_deductions
    await query(`
      UPDATE payroll_deductions 
      SET employee_email = e.email
      FROM employees e
      WHERE payroll_deductions.employee_id = e.employee_id
    `)
    console.log('   ✅ Updated payroll_deductions with employee emails')
    
    // Step 3: Create indexes on email fields
    console.log('\n🔍 Step 3: Creating indexes on email fields...')
    
    for (const table of tablesToUpdate) {
      try {
        await query(`
          CREATE INDEX IF NOT EXISTS idx_${table}_employee_email 
          ON ${table} (employee_email)
        `)
        console.log(`   ✅ Created index on ${table}.employee_email`)
      } catch (error) {
        console.log(`   ⚠️  Index already exists on ${table}.employee_email`)
      }
    }
    
    // Step 4: Verify migration
    console.log('\n✅ Step 4: Verifying migration...')
    
    const verificationQueries = [
      {
        name: 'shift_logs',
        query: 'SELECT COUNT(*) as total, COUNT(employee_email) as with_email FROM shift_logs'
      },
      {
        name: 'payroll_records', 
        query: 'SELECT COUNT(*) as total, COUNT(employee_email) as with_email FROM payroll_records'
      },
      {
        name: 'payroll_bonuses',
        query: 'SELECT COUNT(*) as total, COUNT(employee_email) as with_email FROM payroll_bonuses'
      },
      {
        name: 'payroll_deductions',
        query: 'SELECT COUNT(*) as total, COUNT(employee_email) as with_email FROM payroll_deductions'
      }
    ]
    
    for (const { name, query: sql } of verificationQueries) {
      const result = await query(sql)
      const { total, with_email } = result.rows[0]
      console.log(`   ${name}: ${with_email}/${total} records have email (${Math.round(with_email/total*100)}%)`)
    }
    
    // Step 5: Show new simplified queries
    console.log('\n🎯 Step 5: New Simplified Query Examples...')
    
    console.log('\nOld Complex Query:')
    console.log(`
      SELECT 
        e.employee_id,
        e.first_name,
        sl.total_shift_hours,
        pr.net_pay
      FROM employees e
      LEFT JOIN shift_logs sl ON e.id = sl.employee_id
      LEFT JOIN payroll_records pr ON e.employee_id = pr.employee_id
      WHERE e.employee_id = 'AG001'
    `)
    
    console.log('\nNew Simple Query:')
    console.log(`
      SELECT 
        e.email,
        e.first_name,
        sl.total_shift_hours,
        pr.net_pay
      FROM employees e
      LEFT JOIN shift_logs sl ON e.email = sl.employee_email
      LEFT JOIN payroll_records pr ON e.email = pr.employee_email
      WHERE e.email = 'john.smith@company.com'
    `)
    
    // Step 6: API changes needed
    console.log('\n🌐 Step 6: Required API Changes...')
    
    console.log('\nOld API Endpoints:')
    console.log('POST /api/shift-logs { employee_id: "uuid-here" }')
    console.log('POST /api/payroll/bonuses { employee_id: "AG001" }')
    console.log('GET /api/payroll/records?employee_id=AG001')
    
    console.log('\nNew API Endpoints:')
    console.log('POST /api/shift-logs { employee_email: "john@company.com" }')
    console.log('POST /api/payroll/bonuses { employee_email: "john@company.com" }')
    console.log('GET /api/payroll/records?employee_email=john@company.com')
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📋 Next Steps:')
    console.log('1. Update API endpoints to use employee_email parameter')
    console.log('2. Update frontend to send email instead of ID')
    console.log('3. Test all functionality with email-based system')
    console.log('4. Gradually deprecate old ID-based endpoints')
    console.log('5. Remove old ID fields after full migration')
    
  } catch (error) {
    console.error('❌ Error during migration:', error)
  } finally {
    await pool.end()
  }
}

migrateToEmailSystem()
