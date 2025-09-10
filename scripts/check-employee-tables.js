const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkEmployeeTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking employee-related tables in DEV database...\n');
    
    // Get all tables with 'employee' in the name
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%employee%'
      ORDER BY table_name
    `);
    
    console.log('Employee-related tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if there are multiple employees tables
    const employeeTables = tablesResult.rows.filter(row => 
      row.table_name === 'employees' || row.table_name === 'employees_new'
    );
    
    if (employeeTables.length > 1) {
      console.log('\n⚠️  Found multiple employees tables:');
      employeeTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      // Get row counts for each
      for (const table of employeeTables) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table.table_name}"`);
        console.log(`    ${table.table_name}: ${countResult.rows[0].count} rows`);
      }
      
      // Check if they have the same structure
      console.log('\n📋 Comparing table structures:');
      for (const table of employeeTables) {
        const columnsResult = await client.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        console.log(`\n  ${table.table_name} columns:`);
        columnsResult.rows.forEach(col => {
          console.log(`    ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    } else {
      console.log('\n✅ Only one employees table found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkEmployeeTables();
