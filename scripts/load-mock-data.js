const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

async function loadMockData() {
  const client = await pool.connect();
  
  try {
    console.log('Loading mock data...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'mock-data.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}...`);
          await client.query(statement);
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('Mock data loaded successfully!');
    
    // Verify the data was loaded
    const employeeCount = await client.query('SELECT COUNT(*) FROM employees');
    const timeEntryCount = await client.query('SELECT COUNT(*) FROM time_entries');
    const shiftCount = await client.query('SELECT COUNT(*) FROM shifts');
    
    console.log('\nData Summary:');
    console.log(`- Employees: ${employeeCount.rows[0].count}`);
    console.log(`- Time Entries: ${timeEntryCount.rows[0].count}`);
    console.log(`- Shifts: ${shiftCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error loading mock data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
loadMockData().catch(console.error);
