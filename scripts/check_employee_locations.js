const { Client } = require('pg')

async function checkEmployeeLocations() {
  const connectionString = process.argv[2]
  const client = new Client({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    await client.connect()
    
    console.log('📊 Employee Location Status\n')
    console.log('═══════════════════════════════════════════════\n')

    // Check employees with and without locations
    const result = await client.query(`
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.tenant_id,
        e.location_id,
        l.name as location_name
      FROM employees e
      LEFT JOIN locations l ON e.location_id = l.id
      WHERE e.is_active = true
      ORDER BY e.tenant_id, e.first_name
    `)

    let withLocation = 0
    let withoutLocation = 0

    console.log('Employees:\n')
    result.rows.forEach(emp => {
      const status = emp.location_id ? '✅' : '⚠️ '
      const loc = emp.location_name || 'No location'
      console.log(`${status} ${emp.employee_code} - ${emp.first_name} ${emp.last_name} → ${loc}`)
      
      if (emp.location_id) withLocation++
      else withoutLocation++
    })

    console.log('\n═══════════════════════════════════════════════')
    console.log(`✅ With Location:    ${withLocation}`)
    console.log(`⚠️  Without Location: ${withoutLocation}`)
    console.log(`📊 Total:            ${result.rows.length}`)
    console.log('═══════════════════════════════════════════════\n')

    if (withoutLocation > 0) {
      console.log('⚠️  Some employees need location assignment')
      console.log('Run: npm run db:create-location')
      console.log('Or manually assign in your admin panel\n')
    } else {
      console.log('✅ All employees have locations assigned!\n')
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

checkEmployeeLocations()
