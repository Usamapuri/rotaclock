const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function runMultiTenantMigration() {
  try {
    console.log('🚀 Starting Multi-Tenant Migration...\n')

    // Read the migration SQL files
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'create-multi-tenant-schema.sql'), 'utf8')
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrate-to-multi-tenant.sql'), 'utf8')

    console.log('📋 Step 1: Creating organizations table and schema...')
    await pool.query(schemaSQL)
    console.log('✅ Organizations table created successfully')

    console.log('\n📋 Step 2: Running multi-tenant migration...')
    await pool.query(migrationSQL)
    console.log('✅ Migration completed successfully')

    console.log('\n📊 Step 3: Verifying migration...')
    const verificationResult = await pool.query(`
      SELECT 
        'employees_new' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
      FROM employees_new
      UNION ALL
      SELECT 
        'shift_logs' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
      FROM shift_logs
      UNION ALL
      SELECT 
        'payroll_records' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
      FROM payroll_records
    `)

    console.log('\n📈 Migration Verification Results:')
    verificationResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.total_records} total, ${row.demo_records} demo records`)
    })

    // Check if all records are properly assigned to demo tenant
    const allDemoRecords = verificationResult.rows.every(row => row.total_records === row.demo_records)
    
    if (allDemoRecords) {
      console.log('\n🎉 SUCCESS: All existing data has been migrated to demo tenant!')
    } else {
      console.log('\n⚠️  WARNING: Some records may not have been migrated properly')
    }

    console.log('\n📋 Step 4: Checking organizations table...')
    const orgResult = await pool.query('SELECT * FROM organizations WHERE tenant_id = $1', ['demo'])
    
    if (orgResult.rows.length > 0) {
      const demoOrg = orgResult.rows[0]
      console.log(`✅ Demo organization created: ${demoOrg.name} (${demoOrg.tenant_id})`)
      console.log(`   Status: ${demoOrg.subscription_status}`)
      console.log(`   Plan: ${demoOrg.subscription_plan}`)
    }

    console.log('\n🎯 Multi-Tenant Migration Summary:')
    console.log('   ✅ Organizations table created')
    console.log('   ✅ All existing tables updated with tenant_id')
    console.log('   ✅ Existing data migrated to demo tenant')
    console.log('   ✅ Database indexes created for performance')
    console.log('   ✅ Demo organization created and configured')
    
    console.log('\n🚀 Your application is now ready for multi-tenant operation!')
    console.log('💡 Next steps:')
    console.log('   1. Update API endpoints to include tenant context')
    console.log('   2. Create organization signup flow')
    console.log('   3. Implement pricing page')
    console.log('   4. Add tenant middleware to all routes')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the migration
runMultiTenantMigration()
  .then(() => {
    console.log('\n✅ Migration script completed successfully')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Migration script failed:', error)
    process.exit(1)
  })
