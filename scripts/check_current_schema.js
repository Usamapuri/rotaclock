const { Client } = require('pg')

async function checkSchema() {
  const connectionString = process.argv[2]
  const client = new Client({ 
    connectionString, 
    ssl: { rejectUnauthorized: false } 
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Check employees table structure
    console.log('📋 Checking employees table structure...')
    const empCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `)
    console.log('Employees columns:', empCols.rows.length)
    
    // Check if employees has tenant_id unique constraint
    console.log('\n📋 Checking employees constraints...')
    const empConstraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'employees'
    `)
    console.log('Constraints:', empConstraints.rows)

    // Check if locations table exists
    console.log('\n📋 Checking if locations exists...')
    const locExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'locations'
      )
    `)
    console.log('Locations exists:', locExists.rows[0].exists)

    // Check if manager_locations exists
    console.log('\n📋 Checking if manager_locations exists...')
    const mlExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'manager_locations'
      )
    `)
    console.log('Manager_locations exists:', mlExists.rows[0].exists)

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

checkSchema()

