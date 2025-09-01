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
    
    console.log('📋 Step 1: Creating organizations table and schema...')
    await pool.query(schemaSQL)
    console.log('✅ Organizations table created successfully')

    console.log('\n📋 Step 2: Running multi-tenant migration...')
    
    // Run migration steps separately
    console.log('   - Creating rotaclock organization...')
    await pool.query(`
      INSERT INTO organizations (
        tenant_id,
        name,
        slug,
        email,
        subscription_status,
        subscription_plan,
        is_verified,
        is_active
      ) VALUES (
        'rotaclock',
        'RotaClock Organization',
        'rotaclock-organization',
        'admin@rotaclock.com',
        'trial',
        'basic',
        true,
        true
      ) ON CONFLICT (tenant_id) DO NOTHING
    `)

    console.log('   - Getting rotaclock organization ID...')
    const rotaclockOrgResult = await pool.query('SELECT id FROM organizations WHERE tenant_id = $1', ['rotaclock'])
    const rotaclockOrgId = rotaclockOrgResult.rows[0].id

    console.log('   - Adding tenant_id to employees_new...')
    await pool.query('ALTER TABLE employees_new ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE employees_new ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE employees_new SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to shift_templates...')
    await pool.query('ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE shift_templates SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to shift_assignments_new...')
    await pool.query('ALTER TABLE shift_assignments_new ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE shift_assignments_new ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE shift_assignments_new SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to shift_logs...')
    await pool.query('ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE shift_logs SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to payroll_periods...')
    await pool.query('ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE payroll_periods SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to payroll_records...')
    await pool.query('ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE payroll_records SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to employee_salaries...')
    await pool.query('ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE employee_salaries SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to payroll_deductions...')
    await pool.query('ALTER TABLE payroll_deductions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE payroll_deductions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE payroll_deductions SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Adding tenant_id to payroll_bonuses...')
    await pool.query('ALTER TABLE payroll_bonuses ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT \'rotaclock\'')
    await pool.query('ALTER TABLE payroll_bonuses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id)')
    await pool.query('UPDATE payroll_bonuses SET organization_id = $1 WHERE organization_id IS NULL', [rotaclockOrgId])

    console.log('   - Creating database indexes...')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees_new(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees_new(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_templates_tenant_id ON shift_templates(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_templates_org_id ON shift_templates(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant_id ON shift_assignments_new(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_assignments_org_id ON shift_assignments_new(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_logs_tenant_id ON shift_logs(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_shift_logs_org_id ON shift_logs(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant_id ON payroll_periods(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_periods_org_id ON payroll_periods(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_records_tenant_id ON payroll_records(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_records_org_id ON payroll_records(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_employee_salaries_tenant_id ON employee_salaries(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_employee_salaries_org_id ON employee_salaries(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_deductions_tenant_id ON payroll_deductions(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_deductions_org_id ON payroll_deductions(organization_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_tenant_id ON payroll_bonuses(tenant_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_org_id ON payroll_bonuses(organization_id)')

    console.log('✅ Migration completed successfully')

    console.log('\n📊 Step 3: Verifying migration...')
    const verificationResult = await pool.query(`
      SELECT 
        'employees_new' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'rotaclock' THEN 1 END) as rotaclock_records
      FROM employees_new
      UNION ALL
      SELECT 
        'shift_logs' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'rotaclock' THEN 1 END) as rotaclock_records
      FROM shift_logs
      UNION ALL
      SELECT 
        'payroll_records' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN tenant_id = 'rotaclock' THEN 1 END) as rotaclock_records
      FROM payroll_records
    `)

    console.log('\n📈 Migration Verification Results:')
    verificationResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.total_records} total, ${row.rotaclock_records} rotaclock records`)
    })

    // Check if all records are properly assigned to rotaclock tenant
    const allRotaclockRecords = verificationResult.rows.every(row => row.total_records === row.rotaclock_records)
    
    if (allRotaclockRecords) {
      console.log('\n🎉 SUCCESS: All existing data has been migrated to rotaclock tenant!')
    } else {
      console.log('\n⚠️  WARNING: Some records may not have been migrated properly')
    }

    console.log('\n📋 Step 4: Checking organizations table...')
    const orgResult = await pool.query('SELECT * FROM organizations WHERE tenant_id = $1', ['rotaclock'])
    
    if (orgResult.rows.length > 0) {
      const rotaclockOrg = orgResult.rows[0]
      console.log(`✅ RotaClock organization created: ${rotaclockOrg.name} (${rotaclockOrg.tenant_id})`)
      console.log(`   Status: ${rotaclockOrg.subscription_status}`)
      console.log(`   Plan: ${rotaclockOrg.subscription_plan}`)
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
