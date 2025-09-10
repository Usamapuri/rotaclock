const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkNewTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for _new tables in DEV database...\n');
    
    // Get all tables with '_new' in the name
    const newTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_new'
      ORDER BY table_name
    `);
    
    console.log('Found _new tables:');
    const newTables = newTablesResult.rows.map(row => row.table_name);
    newTables.forEach(table => {
      console.log(`  - ${table}`);
    });
    
    if (newTables.length === 0) {
      console.log('✅ No _new tables found');
      return;
    }
    
    // Get row counts for each _new table
    console.log('\n📊 Row counts for _new tables:');
    for (const table of newTables) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`  ${table}: ${countResult.rows[0].count} rows`);
    }
    
    // Check if corresponding non-_new tables exist
    console.log('\n🔍 Checking for corresponding active tables:');
    for (const newTable of newTables) {
      const activeTable = newTable.replace('_new', '');
      const activeExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )
      `, [activeTable]);
      
      if (activeExists.rows[0].exists) {
        console.log(`  ✅ ${newTable} -> ${activeTable} (active table exists)`);
      } else {
        console.log(`  ❌ ${newTable} -> ${activeTable} (no active table found)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkNewTables();
