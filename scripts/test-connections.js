const { Pool } = require('pg');

async function testConnections() {
  console.log('Testing database connections...\n');
  
  // Test DEV database
  console.log('🔗 Testing DEV database connection...');
  const devPool = new Pool({
    connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const devClient = await devPool.connect();
    const devResult = await devClient.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ DEV DB connected successfully');
    console.log('   Time:', devResult.rows[0].current_time);
    console.log('   Version:', devResult.rows[0].version.split('\n')[0]);
    
    // Get table count
    const devTables = await devClient.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log('   Tables:', devTables.rows[0].table_count);
    
    devClient.release();
  } catch (error) {
    console.error('❌ DEV DB connection failed:', error.message);
  } finally {
    await devPool.end();
  }
  
  console.log('\n🔗 Testing NEW database connection...');
  const newPool = new Pool({
    connectionString: 'postgresql://postgres:IImsWCOMgonNsYLXSDBUGsrpbGNbbsoZ@hopper.proxy.rlwy.net:48063/railway',
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const newClient = await newPool.connect();
    const newResult = await newClient.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ NEW DB connected successfully');
    console.log('   Time:', newResult.rows[0].current_time);
    console.log('   Version:', newResult.rows[0].version.split('\n')[0]);
    
    // Get table count
    const newTables = await newClient.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log('   Tables:', newTables.rows[0].table_count);
    
    newClient.release();
  } catch (error) {
    console.error('❌ NEW DB connection failed:', error.message);
  } finally {
    await newPool.end();
  }
}

testConnections().catch(console.error);
