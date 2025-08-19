const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/rotacloud',
})

async function runMigrations() {
  console.log('🔄 Running database migrations...\n')
  
  try {
    // Migration 1: Add online status fields to employees table
    console.log('📝 Migration 1: Adding online status fields to employees table...')
    const onlineStatusMigration = fs.readFileSync(
      path.join(__dirname, 'add-online-status.sql'), 
      'utf8'
    )
    await pool.query(onlineStatusMigration)
    console.log('✅ Online status fields added successfully\n')

    // Migration 2: Add shift remarks fields to shift_logs table
    console.log('📝 Migration 2: Adding shift remarks fields to shift_logs table...')
    const shiftRemarksMigration = fs.readFileSync(
      path.join(__dirname, 'add-shift-remarks-fields.sql'), 
      'utf8'
    )
    await pool.query(shiftRemarksMigration)
    console.log('✅ Shift remarks fields added successfully\n')

    console.log('🎉 All migrations completed successfully!')
    console.log('\n📋 Summary of changes:')
    console.log('   • Added is_online and last_online fields to employees table')
    console.log('   • Added total_calls_taken, leads_generated, shift_remarks, and performance_rating to shift_logs table')
    console.log('   • Created indexes for better performance')
    console.log('\n🚀 The new attendance workflow is now ready:')
    console.log('   • Employees can verify and automatically clock in')
    console.log('   • Clock-out includes shift remarks and performance data')
    console.log('   • Online status is tracked and visible to admins/team leads')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations()
}

module.exports = { runMigrations }
