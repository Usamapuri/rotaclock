const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

async function dropLegacyObjects() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding and dropping legacy _new objects...\n');
    
    // Check for tables with _new
    const tableResult = await client.query(`
      SELECT tablename
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%_new'
      ORDER BY tablename
    `);
    
    // Check for views with _new
    const viewResult = await client.query(`
      SELECT viewname
      FROM pg_views 
      WHERE schemaname = 'public' AND viewname LIKE '%_new'
      ORDER BY viewname
    `);
    
    const tables = tableResult.rows.map(row => row.tablename);
    const views = viewResult.rows.map(row => row.viewname);
    
    console.log('Found legacy objects:');
    tables.forEach(table => console.log(`  - ${table} (table)`));
    views.forEach(view => console.log(`  - ${view} (view)`));
    
    if (tables.length === 0 && views.length === 0) {
      console.log('✅ No legacy _new objects found');
      return;
    }
    
    // Drop tables
    for (const table of tables) {
      console.log(`\n🗑️  Dropping table ${table}...`);
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✅ Table ${table} dropped successfully`);
      } catch (error) {
        console.log(`  ❌ Failed to drop table ${table}: ${error.message}`);
      }
    }
    
    // Drop views
    for (const view of views) {
      console.log(`\n🗑️  Dropping view ${view}...`);
      try {
        await client.query(`DROP VIEW IF EXISTS "${view}" CASCADE`);
        console.log(`  ✅ View ${view} dropped successfully`);
      } catch (error) {
        console.log(`  ❌ Failed to drop view ${view}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Legacy object cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropLegacyObjects()
  .then(() => {
    console.log('\n✅ Cleanup script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Cleanup script failed:', error);
    process.exit(1);
  });
