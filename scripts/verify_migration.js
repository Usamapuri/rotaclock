const { Client } = require('pg')

async function verify() {
  const connectionString = process.env.DATABASE_URL || process.argv[2]
  
  if (!connectionString) {
    console.error('❌ Error: No database connection string provided')
    console.log('Usage: node scripts/verify_migration.js <connection-string>')
    console.log('   or: DATABASE_URL=<connection-string> node scripts/verify_migration.js')
    process.exit(1)
  }

  const client = new Client({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    console.log('🔌 Connecting to database...\n')
    await client.connect()
    console.log('✅ Connected successfully\n')

    const checks = []
    let passed = 0
    let failed = 0

    // 1. Check locations table
    console.log('1️⃣  Checking locations table...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'locations'
        ) as exists
      `)
      if (result.rows[0].exists) {
        const count = await client.query('SELECT COUNT(*) as count FROM locations')
        console.log(`   ✅ locations table exists (${count.rows[0].count} rows)\n`)
        passed++
      } else {
        console.log('   ❌ locations table MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking locations: ${err.message}\n`)
      failed++
    }

    // 2. Check manager_locations table
    console.log('2️⃣  Checking manager_locations table...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'manager_locations'
        ) as exists
      `)
      if (result.rows[0].exists) {
        console.log('   ✅ manager_locations table exists\n')
        passed++
      } else {
        console.log('   ❌ manager_locations table MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking manager_locations: ${err.message}\n`)
      failed++
    }

    // 3. Check tenant_settings table
    console.log('3️⃣  Checking tenant_settings table...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tenant_settings'
        ) as exists
      `)
      if (result.rows[0].exists) {
        console.log('   ✅ tenant_settings table exists\n')
        passed++
      } else {
        console.log('   ❌ tenant_settings table MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking tenant_settings: ${err.message}\n`)
      failed++
    }

    // 4. Check pay_periods table
    console.log('4️⃣  Checking pay_periods table...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'pay_periods'
        ) as exists
      `)
      if (result.rows[0].exists) {
        console.log('   ✅ pay_periods table exists\n')
        passed++
      } else {
        console.log('   ❌ pay_periods table MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking pay_periods: ${err.message}\n`)
      failed++
    }

    // 5. Check time_entries.approval_status column
    console.log('5️⃣  Checking time_entries.approval_status column...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'time_entries' 
          AND column_name = 'approval_status'
        ) as exists
      `)
      if (result.rows[0].exists) {
        console.log('   ✅ time_entries.approval_status exists\n')
        passed++
      } else {
        console.log('   ❌ time_entries.approval_status MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking approval_status: ${err.message}\n`)
      failed++
    }

    // 6. Check time_entries approval columns (batch)
    console.log('6️⃣  Checking all time_entries approval columns...')
    try {
      const columns = ['approved_by', 'approved_at', 'rejection_reason', 'admin_notes', 'approved_hours', 'approved_rate', 'total_pay']
      let allExist = true
      const missingColumns = []
      
      for (const col of columns) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'time_entries' 
            AND column_name = $1
          ) as exists
        `, [col])
        if (!result.rows[0].exists) {
          allExist = false
          missingColumns.push(col)
        }
      }
      
      if (allExist) {
        console.log('   ✅ All approval columns exist\n')
        passed++
      } else {
        console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}\n`)
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking approval columns: ${err.message}\n`)
      failed++
    }

    // 7. Check employees.location_id column
    console.log('7️⃣  Checking employees.location_id column...')
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'employees' 
          AND column_name = 'location_id'
        ) as exists
      `)
      if (result.rows[0].exists) {
        console.log('   ✅ employees.location_id exists\n')
        passed++
      } else {
        console.log('   ❌ employees.location_id MISSING\n')
        failed++
      }
    } catch (err) {
      console.log(`   ❌ Error checking location_id: ${err.message}\n`)
      failed++
    }

    // 8. Check data integrity
    console.log('8️⃣  Checking data integrity...')
    try {
      const orgResult = await client.query('SELECT COUNT(*) as count FROM organizations')
      const empResult = await client.query('SELECT COUNT(*) as count FROM employees')
      const locResult = await client.query('SELECT COUNT(*) as count FROM locations')
      const teResult = await client.query('SELECT COUNT(*) as count FROM time_entries')
      
      console.log(`   📊 Organizations: ${orgResult.rows[0].count}`)
      console.log(`   📊 Employees: ${empResult.rows[0].count}`)
      console.log(`   📊 Locations: ${locResult.rows[0].count}`)
      console.log(`   📊 Time Entries: ${teResult.rows[0].count}`)
      
      if (locResult.rows[0].count === '0') {
        console.log('   ⚠️  WARNING: No locations found. You should create at least one location.')
      }
      console.log('')
      passed++
    } catch (err) {
      console.log(`   ❌ Error checking data: ${err.message}\n`)
      failed++
    }

    // Summary
    console.log('═══════════════════════════════════════════════')
    console.log('📋 MIGRATION VERIFICATION SUMMARY')
    console.log('═══════════════════════════════════════════════')
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📊 Total:  ${passed + failed}`)
    console.log('')

    if (failed === 0) {
      console.log('🎉 All checks passed! Your database schema is up to date.')
      console.log('')
      console.log('Next steps:')
      console.log('1. Restart your application')
      console.log('2. Test the admin dashboard')
      console.log('3. Verify Reports & Analytics page loads')
      console.log('4. Check Employee list loads correctly')
      console.log('5. Test Shift Approvals functionality')
    } else {
      console.log('⚠️  Some checks failed. Please:')
      console.log('1. Re-run the migration: node scripts/run_sql.js <connection-string> scripts/20250101_fix_missing_schema.sql')
      console.log('2. Check Railway logs for errors')
      console.log('3. Verify your connection string is correct')
    }
    console.log('')

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    process.exit(2)
  } finally {
    await client.end()
    console.log('👋 Disconnected from database')
  }
}

verify()

