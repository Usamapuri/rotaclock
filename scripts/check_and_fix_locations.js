const { Client } = require('pg')

async function fixLocations() {
  const connectionString = process.argv[2]
  const client = new Client({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    await client.connect()
    
    console.log('📍 Checking ALL locations (including inactive)...\n')

    // Get ALL locations
    const allLocs = await client.query(`
      SELECT id, tenant_id, name, is_active
      FROM locations
      ORDER BY tenant_id, created_at
    `)

    console.log(`Found ${allLocs.rows.length} total location(s):\n`)
    allLocs.rows.forEach(loc => {
      const status = loc.is_active ? '✅' : '❌'
      console.log(`  ${status} ${loc.name} (${loc.tenant_id}) - Active: ${loc.is_active}`)
    })

    // If locations exist but are inactive, activate them
    const inactiveLocs = allLocs.rows.filter(l => !l.is_active)
    if (inactiveLocs.length > 0) {
      console.log(`\n🔧 Activating ${inactiveLocs.length} inactive location(s)...\n`)
      
      for (const loc of inactiveLocs) {
        await client.query(`
          UPDATE locations 
          SET is_active = true, updated_at = NOW()
          WHERE id = $1
        `, [loc.id])
        console.log(`  ✅ Activated: ${loc.name}`)
      }
    }

    // If no locations exist at all, create them
    if (allLocs.rows.length === 0) {
      console.log('\n📝 No locations found. Creating default locations...\n')
      
      // Get all tenants
      const orgs = await client.query(`
        SELECT id, tenant_id, name
        FROM organizations
        WHERE is_active = true
      `)

      for (const org of orgs.rows) {
        const result = await client.query(`
          INSERT INTO locations (tenant_id, organization_id, name, description, is_active)
          VALUES ($1, $2, $3, $4, true)
          RETURNING id, name
        `, [org.tenant_id, org.id, 'Main Office', 'Primary company location'])
        
        console.log(`  ✅ Created: ${result.rows[0].name} for ${org.name}`)
      }
    }

    console.log('\n✅ Location setup complete!\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

fixLocations()

