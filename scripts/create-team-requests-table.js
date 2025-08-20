const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTeamRequestsTable() {
  try {
    console.log('📝 Creating team_requests table...')
    
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('dock', 'bonus')),
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        reason TEXT NOT NULL,
        effective_date DATE NOT NULL,
        additional_notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_notes TEXT,
        reviewed_by UUID REFERENCES employees(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ Table created successfully')
    
    // Add indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_team_lead_id ON team_requests(team_lead_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_team_id ON team_requests(team_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_employee_id ON team_requests(employee_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_type ON team_requests(type)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_status ON team_requests(status)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_effective_date ON team_requests(effective_date)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_requests_created_at ON team_requests(created_at)')
    console.log('✅ Indexes created successfully')
    
    // Create trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_team_requests_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
    console.log('✅ Trigger function created successfully')
    
    // Create trigger
    await pool.query(`
      DROP TRIGGER IF EXISTS update_team_requests_updated_at ON team_requests;
      CREATE TRIGGER update_team_requests_updated_at 
        BEFORE UPDATE ON team_requests 
        FOR EACH ROW 
        EXECUTE FUNCTION update_team_requests_updated_at()
    `)
    console.log('✅ Trigger created successfully')
    
    // Verify the table was created
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_requests' 
      ORDER BY ordinal_position
    `)
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ team_requests table created successfully!')
      console.log('📊 Table structure:')
      verifyResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('❌ team_requests table not found')
    }
    
    console.log('\n🎉 Team requests table migration completed!')
    
  } catch (error) {
    console.error('❌ Error creating team_requests table:', error)
  } finally {
    await pool.end()
  }
}

// Run the migration
createTeamRequestsTable()
  .then(() => {
    console.log('\n✅ Team requests table creation script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
