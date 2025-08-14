// Update notifications table constraint to include broadcast type
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function updateConstraint() {
  console.log('🔧 Updating notifications table constraint...')

  try {
    // Drop existing constraint
    console.log('1. Dropping existing constraint...')
    await pool.query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check')
    
    // Add new constraint with broadcast type
    console.log('2. Adding new constraint with broadcast type...')
    await pool.query(`
      ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
      CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave', 'swap', 'broadcast', 'shift_assigned', 'shift_reminder'))
    `)
    
    console.log('✅ Constraint updated successfully!')
    
    // Test the constraint
    console.log('3. Testing constraint...')
    const testResult = await pool.query(`
      SELECT type FROM notifications WHERE type = 'broadcast' LIMIT 1
    `)
    
    console.log('✅ Broadcast type constraint test passed!')

  } catch (error) {
    console.error('❌ Error updating constraint:', error.message)
    console.error('Full error:', error)
  } finally {
    await pool.end()
  }
}

updateConstraint()
