const { query } = require('../lib/database');

async function checkDatabaseStructure() {
  try {
    console.log('Checking database structure...\n');

    // Check what tables exist
    const tablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

    console.log('\n');

    // Check employees_new table structure
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'employees_new'
      ORDER BY ordinal_position;
    `);

    console.log('employees_new table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n');

    // Check teams table structure
    const teamsColumnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teams'
      ORDER BY ordinal_position;
    `);

    console.log('teams table columns:');
    teamsColumnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error checking database structure:', error);
  }
}

checkDatabaseStructure();
