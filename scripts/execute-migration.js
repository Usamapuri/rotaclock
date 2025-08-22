const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: { rejectUnauthorized: false }
});

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Step 1: Read the optimized schema
    const schemaPath = path.join(__dirname, 'optimized-database-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing optimized schema...');
    await client.query(schemaSQL);
    console.log('✅ Optimized schema created successfully');
    
    // Step 2: Read and execute migration script
    const migrationPath = path.join(__dirname, 'migrate-to-optimized-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Executing data migration...');
    await client.query(migrationSQL);
    console.log('✅ Data migration completed successfully');
    
    // Step 3: Verify migration
    console.log('🔍 Verifying migration...');
    const verificationQueries = [
      'SELECT COUNT(*) as employee_count FROM employees',
      'SELECT COUNT(*) as team_count FROM teams',
      'SELECT COUNT(*) as template_count FROM shift_templates',
      'SELECT COUNT(*) as assignment_count FROM shift_assignments',
      'SELECT COUNT(*) as time_entry_count FROM time_entries'
    ];
    
    for (const query of verificationQueries) {
      const result = await client.query(query);
      const tableName = query.match(/FROM (\w+)/)[1];
      console.log(`   ${tableName}: ${result.rows[0][Object.keys(result.rows[0])[0]]} records`);
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
executeMigration().catch(console.error);
