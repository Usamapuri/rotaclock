const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let pool;
  
  try {
    console.log('🔧 Starting shift approval system migration...');
    
    // Use the same connection configuration as the main application
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 750,
      ssl: {
        rejectUnauthorized: false
      },
      statement_timeout: 30000,
      query_timeout: 30000
    });

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Read and execute migration
    const migrationPath = path.join(__dirname, 'add-shift-approval-system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing migration...');
    await pool.query(sql);
    
    console.log('✅ Shift approval system migration completed successfully!');
    console.log('');
    console.log('📋 Migration Summary:');
    console.log('   • Added approval_status column to shift_logs table');
    console.log('   • Added approved_by, approved_at, rejection_reason columns');
    console.log('   • Added admin_notes, approved_hours, approved_rate, total_pay columns');
    console.log('   • Created shift_approvals table for audit trail');
    console.log('   • Created database indexes for performance');
    console.log('   • Created views for easy querying');
    console.log('   • Updated existing completed shifts to approved status');
    console.log('');
    console.log('🚀 Your shift approval system is now ready!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the migration
runMigration();
