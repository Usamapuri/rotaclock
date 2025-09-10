const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkObjectTypes() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking object types for _new objects...\n');
    
    // Check if it's a table
    const tableResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_new'
      ORDER BY table_name
    `);
    
    console.log('Tables with _new:');
    tableResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    // Check if it's a view
    const viewResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%_new'
      ORDER BY table_name
    `);
    
    console.log('\nViews with _new:');
    viewResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    // Check all objects with _new
    const allObjectsResult = await client.query(`
      SELECT 
        schemaname,
        tablename as object_name,
        'table' as object_type
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename LIKE '%_new'
      UNION ALL
      SELECT 
        schemaname,
        viewname as object_name,
        'view' as object_type
      FROM pg_views 
      WHERE schemaname = 'public' AND viewname LIKE '%_new'
      ORDER BY object_name
    `);
    
    console.log('\nAll _new objects:');
    allObjectsResult.rows.forEach(row => {
      console.log(`  - ${row.object_name} (${row.object_type})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkObjectTypes();
