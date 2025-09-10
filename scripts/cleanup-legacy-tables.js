const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

async function cleanupLegacyTables() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning up legacy _new tables...\n');
    
    // Check what _new tables exist
    const newTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_new'
      ORDER BY table_name
    `);
    
    const newTables = newTablesResult.rows.map(row => row.table_name);
    
    if (newTables.length === 0) {
      console.log('✅ No legacy _new tables found to clean up');
      return;
    }
    
    console.log('Found legacy tables to remove:');
    newTables.forEach(table => {
      console.log(`  - ${table}`);
    });
    
    // Get row counts before dropping
    console.log('\n📊 Row counts before cleanup:');
    for (const table of newTables) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`  ${table}: ${countResult.rows[0].count} rows`);
    }
    
    // Drop the tables
    console.log('\n🗑️  Dropping legacy tables...');
    for (const table of newTables) {
      console.log(`  Dropping ${table}...`);
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      console.log(`  ✅ ${table} dropped successfully`);
    }
    
    console.log('\n🎉 Legacy table cleanup completed!');
    console.log(`✅ Removed ${newTables.length} legacy table(s)`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupLegacyTables()
  .then(() => {
    console.log('\n✅ Cleanup script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  });
