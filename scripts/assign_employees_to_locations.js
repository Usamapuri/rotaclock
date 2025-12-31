const { Client } = require('pg')

async function assignEmployees() {
  const connectionString = process.argv[2]
  const client = new Client({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    await client.connect()
    
    console.log('📍 Checking existing locations...\n')

    // Get all locations by tenant
    const locations = await client.query(`
      SELECT id, tenant_id, name, description
      FROM locations
      WHERE is_active = true
      ORDER BY tenant_id, created_at
    `)

    console.log(`Found ${locations.rows.length} location(s):\n`)
    locations.rows.forEach(loc => {
      console.log(`  📍 ${loc.name} (${loc.tenant_id})`)
    })
    console.log('')

    // Get all employees without locations
    const employees = await client.query(`
      SELECT id, employee_code, first_name, last_name, tenant_id
      FROM employees
      WHERE is_active = true AND location_id IS NULL
      ORDER BY tenant_id
    `)

    if (employees.rows.length === 0) {
      console.log('✅ All employees already have locations!\n')
      return
    }

    console.log(`📊 Assigning ${employees.rows.length} employee(s) to locations...\n`)

    let assigned = 0
    
    // Assign each employee to a location in their tenant
    for (const emp of employees.rows) {
      // Find a location for this employee's tenant
      const location = locations.rows.find(l => l.tenant_id === emp.tenant_id)
      
      if (location) {
        await client.query(`
          UPDATE employees 
          SET location_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [location.id, emp.id])
        
        console.log(`  ✅ ${emp.employee_code} → ${location.name}`)
        assigned++
      } else {
        console.log(`  ⚠️  ${emp.employee_code} - No location found for tenant ${emp.tenant_id}`)
      }
    }

    console.log(`\n═══════════════════════════════════════════════`)
    console.log(`✅ Successfully assigned ${assigned} employee(s) to locations`)
    console.log(`═══════════════════════════════════════════════\n`)

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

assignEmployees()

