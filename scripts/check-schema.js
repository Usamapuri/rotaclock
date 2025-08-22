const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current database schema...');
    
    // Check time_entries table structure
    const timeEntriesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'time_entries' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 time_entries table columns:');
    timeEntriesColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check employees table structure
    const employeesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 employees table columns:');
    employeesColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check shifts table structure
    const shiftsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 shifts table columns:');
    shiftsColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check shift_assignments table structure
    const assignmentsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'shift_assignments' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 shift_assignments table columns:');
    assignmentsColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
