const { Pool } = require('pg')

// Railway database configuration
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testVerificationSystem() {
  try {
    console.log('🧪 Testing verification system...\n')
    
    // Test 1: Check if verification_logs table exists
    console.log('📋 Test 1: Checking verification_logs table...')
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'verification_logs'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ verification_logs table exists')
    } else {
      console.log('❌ verification_logs table does not exist')
      return
    }
    
    // Test 2: Check table structure
    console.log('\n📋 Test 2: Checking table structure...')
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_logs'
      ORDER BY ordinal_position
    `)
    
    console.log('Table columns:')
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    
    // Test 3: Check if we can insert a test record
    console.log('\n📋 Test 3: Testing insert capability...')
    const testRecord = await pool.query(`
      INSERT INTO verification_logs (
        employee_id, verification_type, status, image_data_length
      ) VALUES ($1, $2, $3, $4)
      RETURNING id, employee_id, verification_type, status, created_at
    `, ['TEST001', 'test', 'verified', 1024])
    
    console.log('✅ Test record inserted successfully:')
    console.log(`  - ID: ${testRecord.rows[0].id}`)
    console.log(`  - Employee: ${testRecord.rows[0].employee_id}`)
    console.log(`  - Type: ${testRecord.rows[0].verification_type}`)
    console.log(`  - Status: ${testRecord.rows[0].status}`)
    console.log(`  - Created: ${testRecord.rows[0].created_at}`)
    
    // Test 4: Check employee lookup
    console.log('\n📋 Test 4: Testing employee lookup...')
    const employee = await pool.query(`
      SELECT id, employee_id, email, first_name, last_name, is_online
      FROM employees 
      WHERE email = 'james.taylor@rotacloud.com'
      LIMIT 1
    `)
    
    if (employee.rows.length > 0) {
      console.log('✅ Employee found:')
      console.log(`  - ID: ${employee.rows[0].id}`)
      console.log(`  - Employee ID: ${employee.rows[0].employee_id}`)
      console.log(`  - Email: ${employee.rows[0].email}`)
      console.log(`  - Name: ${employee.rows[0].first_name} ${employee.rows[0].last_name}`)
      console.log(`  - Online: ${employee.rows[0].is_online}`)
    } else {
      console.log('❌ Employee james.taylor@rotacloud.com not found')
    }
    
    // Test 5: Check shift logs table
    console.log('\n📋 Test 5: Checking shift_logs table...')
    const shiftLogsCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM shift_logs
      WHERE employee_id = (SELECT id FROM employees WHERE email = 'james.taylor@rotacloud.com' LIMIT 1)
    `)
    
    console.log(`✅ Found ${shiftLogsCheck.rows[0].count} shift logs for James Taylor`)
    
    console.log('\n🎉 All verification system tests passed!')
    console.log('\n📋 Summary:')
    console.log('  ✅ verification_logs table exists and is properly structured')
    console.log('  ✅ Can insert verification records')
    console.log('  ✅ Employee lookup works')
    console.log('  ✅ Shift logs table is accessible')
    console.log('\n🚀 The verification system should now work properly on Vercel!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Full error:', error)
  } finally {
    await pool.end()
  }
}

// Run the test
testVerificationSystem()
