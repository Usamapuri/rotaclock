const { Client } = require('pg')

async function createDefaultLocation() {
  const connectionString = process.env.DATABASE_URL || process.argv[2]
  
  if (!connectionString) {
    console.error('❌ Error: No database connection string provided')
    console.log('Usage: node scripts/create_default_location.js <connection-string>')
    console.log('   or: DATABASE_URL=<connection-string> node scripts/create_default_location.js')
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

    // Get all organizations/tenants
    console.log('📋 Fetching organizations...')
    const orgsResult = await client.query(`
      SELECT id, tenant_id, name 
      FROM organizations 
      WHERE is_active = true
      ORDER BY created_at
    `)

    if (orgsResult.rows.length === 0) {
      console.log('❌ No organizations found in database')
      console.log('   Please create an organization first')
      process.exit(1)
    }

    console.log(`   Found ${orgsResult.rows.length} organization(s)\n`)

    // Create location for each organization
    for (const org of orgsResult.rows) {
      console.log(`🏢 Processing: ${org.name} (${org.tenant_id})`)

      // Check if location already exists
      const existingLoc = await client.query(`
        SELECT id, name 
        FROM locations 
        WHERE tenant_id = $1
      `, [org.tenant_id])

      if (existingLoc.rows.length > 0) {
        console.log(`   ℹ️  Already has ${existingLoc.rows.length} location(s):`)
        existingLoc.rows.forEach(loc => {
          console.log(`      - ${loc.name} (${loc.id})`)
        })
        console.log('')
        continue
      }

      // Create default location
      const locationName = 'Main Office'
      const locationDesc = 'Primary company location'

      console.log(`   ➕ Creating location: "${locationName}"`)
      
      const result = await client.query(`
        INSERT INTO locations (
          tenant_id, 
          organization_id, 
          name, 
          description, 
          is_active
        ) VALUES ($1, $2, $3, $4, true)
        RETURNING id, name
      `, [org.tenant_id, org.id, locationName, locationDesc])

      const newLocation = result.rows[0]
      console.log(`   ✅ Created: ${newLocation.name} (${newLocation.id})`)

      // Count employees without location
      const empCount = await client.query(`
        SELECT COUNT(*) as count 
        FROM employees 
        WHERE tenant_id = $1 
        AND location_id IS NULL
        AND is_active = true
      `, [org.tenant_id])

      const unassignedCount = parseInt(empCount.rows[0].count)

      if (unassignedCount > 0) {
        console.log(`   👥 Found ${unassignedCount} employee(s) without location`)
        console.log('   🔄 Assigning them to new location...')

        await client.query(`
          UPDATE employees 
          SET location_id = $1, updated_at = NOW()
          WHERE tenant_id = $2 
          AND location_id IS NULL
          AND is_active = true
        `, [newLocation.id, org.tenant_id])

        console.log(`   ✅ Assigned ${unassignedCount} employee(s) to ${locationName}`)
      } else {
        console.log('   ℹ️  No employees need location assignment')
      }

      console.log('')
    }

    // Summary
    console.log('═══════════════════════════════════════════════')
    console.log('📊 SUMMARY')
    console.log('═══════════════════════════════════════════════')

    const locationSummary = await client.query(`
      SELECT 
        o.name as org_name,
        o.tenant_id,
        COUNT(DISTINCT l.id) as location_count,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(DISTINCT CASE WHEN e.location_id IS NOT NULL THEN e.id END) as assigned_count
      FROM organizations o
      LEFT JOIN locations l ON o.tenant_id = l.tenant_id
      LEFT JOIN employees e ON o.tenant_id = e.tenant_id AND e.is_active = true
      WHERE o.is_active = true
      GROUP BY o.id, o.name, o.tenant_id
      ORDER BY o.created_at
    `)

    locationSummary.rows.forEach(row => {
      console.log(`\n🏢 ${row.org_name}`)
      console.log(`   📍 Locations: ${row.location_count}`)
      console.log(`   👥 Employees: ${row.employee_count}`)
      console.log(`   ✅ Assigned:  ${row.assigned_count}`)
      
      if (row.employee_count > 0 && row.assigned_count < row.employee_count) {
        const unassigned = row.employee_count - row.assigned_count
        console.log(`   ⚠️  Unassigned: ${unassigned}`)
      }
    })

    console.log('\n═══════════════════════════════════════════════')
    console.log('✅ Location setup complete!')
    console.log('\nNext steps:')
    console.log('1. Restart your application')
    console.log('2. Test the admin dashboard')
    console.log('3. Visit /admin/employees to verify locations')
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === '23505') {
      console.log('\n⚠️  Duplicate location detected. This is usually safe to ignore.')
      console.log('   Run this script again to see current state.')
    }
    process.exit(2)
  } finally {
    await client.end()
    console.log('👋 Disconnected from database\n')
  }
}

createDefaultLocation()

