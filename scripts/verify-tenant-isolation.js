const { Pool } = require('pg');

// Test both databases
const devPool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

const newPool = new Pool({
  connectionString: 'postgresql://postgres:IImsWCOMgonNsYLXSDBUGsrpbGNbbsoZ@hopper.proxy.rlwy.net:48063/railway',
  ssl: { rejectUnauthorized: false }
});

async function verifyTenantIsolation(pool, dbName) {
  const client = await pool.connect();
  
  try {
    console.log(`\n🔍 Verifying tenant isolation in ${dbName} database...`);
    
    // Check if tenant_id column exists in key tables
    const keyTables = ['employees', 'organizations', 'shift_assignments', 'time_entries', 'teams'];
    
    for (const tableName of keyTables) {
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'tenant_id'
      `, [tableName]);
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${tableName} has tenant_id column`);
        
        // Check tenant distribution
        const tenantResult = await client.query(`
          SELECT tenant_id, COUNT(*) as count 
          FROM "${tableName}" 
          GROUP BY tenant_id 
          ORDER BY count DESC
        `);
        
        console.log(`    Tenant distribution:`);
        tenantResult.rows.forEach(row => {
          console.log(`      ${row.tenant_id}: ${row.count} records`);
        });
      } else {
        console.log(`  ❌ ${tableName} missing tenant_id column`);
      }
    }
    
    // Check organizations table
    const orgResult = await client.query(`
      SELECT tenant_id, name, subscription_status 
      FROM organizations 
      ORDER BY tenant_id
    `);
    
    console.log(`\n  Organizations:`);
    orgResult.rows.forEach(row => {
      console.log(`    ${row.tenant_id}: ${row.name} (${row.subscription_status})`);
    });
    
  } catch (error) {
    console.error(`❌ Error verifying ${dbName}:`, error.message);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await verifyTenantIsolation(devPool, 'DEV');
    await verifyTenantIsolation(newPool, 'NEW');
    
    console.log('\n🎉 Tenant isolation verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await devPool.end();
    await newPool.end();
  }
}

main();