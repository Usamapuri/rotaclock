// Test if notifications table exists and check its structure
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testNotificationsTable() {
  console.log('🔍 Testing notifications table...')

  try {
    // Test 1: Check if table exists
    console.log('\n1. Checking if notifications table exists...')
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `)
    
    console.log('Table exists:', tableExists.rows[0].exists)

    if (!tableExists.rows[0].exists) {
      console.log('❌ Notifications table does not exist!')
      return
    }

    // Test 2: Check table structure
    console.log('\n2. Checking table structure...')
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'notifications'
      ORDER BY ordinal_position
    `)
    
    // Check the check constraint for type column
    console.log('\n2a. Checking type constraint...')
    const constraint = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'notifications'::regclass 
      AND contype = 'c'
    `)
    
    console.log('Type constraint:', constraint.rows[0]?.definition)
    
    console.log('Table structure:')
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Test 3: Check if we can insert a test notification
    console.log('\n3. Testing insert...')
    
    // Get a real employee ID first
    const employeeResult = await pool.query(`
      SELECT id FROM employees WHERE is_active = true LIMIT 1
    `)
    
    if (employeeResult.rows.length === 0) {
      console.log('❌ No active employees found')
      return
    }
    
    const employeeId = employeeResult.rows[0].id
    console.log('Using employee ID:', employeeId)
    
    const testInsert = await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, read)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, message
    `, [
      employeeId,
      'Test Notification',
      'This is a test notification',
      'broadcast',
      false
    ])
    
    console.log('✅ Insert successful:', testInsert.rows[0])

    // Test 4: Check employees table
    console.log('\n4. Checking employees table...')
    const employees = await pool.query(`
      SELECT id, first_name, last_name, is_active 
      FROM employees 
      WHERE is_active = true
      LIMIT 5
    `)
    
    console.log('Active employees:')
    employees.rows.forEach(emp => {
      console.log(`  - ${emp.first_name} ${emp.last_name} (ID: ${emp.id})`)
    })

    // Test 5: Clean up test data
    console.log('\n5. Cleaning up test data...')
    await pool.query(`
      DELETE FROM notifications 
      WHERE user_id = $1
    `, [employeeId])
    console.log('✅ Cleanup complete')

  } catch (error) {
    console.error('❌ Error testing notifications table:', error.message)
    console.error('Full error:', error)
  } finally {
    await pool.end()
  }
}

testNotificationsTable()
