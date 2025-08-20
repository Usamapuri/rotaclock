const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTeamReportsTable() {
  try {
    console.log('📝 Creating team_reports table...')
    
    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        team_name VARCHAR(255) NOT NULL,
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,
        summary TEXT NOT NULL,
        highlights JSONB DEFAULT '[]',
        concerns JSONB DEFAULT '[]',
        recommendations JSONB DEFAULT '[]',
        statistics JSONB NOT NULL,
        meeting_notes JSONB NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
        pm_notes TEXT,
        pm_reviewed_by UUID REFERENCES employees(id),
        pm_reviewed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('✅ Table created successfully')
    
    // Add indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_reports_team_lead_id ON team_reports(team_lead_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_reports_team_id ON team_reports(team_id)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_reports_date_range ON team_reports(date_from, date_to)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_reports_status ON team_reports(status)')
    await pool.query('CREATE INDEX IF NOT EXISTS idx_team_reports_created_at ON team_reports(created_at)')
    console.log('✅ Indexes created successfully')
    
    // Create trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_team_reports_updated_at()
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
      DROP TRIGGER IF EXISTS update_team_reports_updated_at ON team_reports;
      CREATE TRIGGER update_team_reports_updated_at 
        BEFORE UPDATE ON team_reports 
        FOR EACH ROW 
        EXECUTE FUNCTION update_team_reports_updated_at()
    `)
    console.log('✅ Trigger created successfully')
    
    // Verify the table was created
    const verifyResult = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_reports' 
      ORDER BY ordinal_position
    `)
    
    if (verifyResult.rows.length > 0) {
      console.log('\n✅ team_reports table created successfully!')
      console.log('📊 Table structure:')
      verifyResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log('❌ team_reports table not found')
    }
    
    console.log('\n🎉 Team reports table migration completed!')
    
  } catch (error) {
    console.error('❌ Error creating team_reports table:', error)
  } finally {
    await pool.end()
  }
}

// Run the migration
createTeamReportsTable()
  .then(() => {
    console.log('\n✅ Team reports table creation script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
