const { Pool } = require('pg')

// Railway database configuration using public URL
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function addVerificationLogsTable() {
  try {
    console.log('🔄 Adding verification_logs table to Railway database...')
    
    // Create verification_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_logs (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        verification_type VARCHAR(50) NOT NULL DEFAULT 'shift_start',
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        status VARCHAR(20) NOT NULL DEFAULT 'verified',
        image_data_length INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    
    console.log('✅ verification_logs table created successfully')
    
    // Add indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_employee_id ON verification_logs(employee_id)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp)
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_type ON verification_logs(verification_type)
    `)
    
    console.log('✅ Indexes created successfully')
    
    // Add comment
    await pool.query(`
      COMMENT ON TABLE verification_logs IS 'Stores verification records for employee shift starts and other verification events'
    `)
    
    console.log('✅ Table comment added')
    
    console.log('🎉 verification_logs table migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Error adding verification_logs table:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
addVerificationLogsTable()
