const { Pool } = require('pg');

// Source (DEV) and Target (NEW) database connections
const sourcePool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

const targetPool = new Pool({
  connectionString: 'postgresql://postgres:IImsWCOMgonNsYLXSDBUGsrpbGNbbsoZ@hopper.proxy.rlwy.net:48063/railway',
  ssl: { rejectUnauthorized: false }
});

async function simpleCopy() {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  
  try {
    console.log('🔄 Starting simple database copy...\n');
    
    // Step 1: Get all table names
    console.log('📋 Getting table list...');
    const tablesResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables\n`);
    
    // Step 2: Drop all tables in target
    console.log('📋 Dropping existing tables...');
    for (const tableName of tables.reverse()) {
      console.log(`  Dropping ${tableName}...`);
      await targetClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
    
    // Step 3: Get and execute CREATE TABLE statements
    console.log('\n📋 Creating tables...');
    for (const tableName of tables) {
      console.log(`  Creating ${tableName}...`);
      
      // Get the CREATE TABLE statement from source
      const createResult = await sourceClient.query(`
        SELECT 
          'CREATE TABLE "' || table_name || '" (' ||
          string_agg(
            '"' || column_name || '" ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR' || 
                CASE WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')' ELSE '' END
              WHEN data_type = 'numeric' THEN 'DECIMAL' ||
                CASE WHEN numeric_precision IS NOT NULL THEN '(' || numeric_precision || 
                  CASE WHEN numeric_scale IS NOT NULL THEN ',' || numeric_scale ELSE '' END || ')' ELSE '' END
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMP WITH TIME ZONE'
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'time without time zone' THEN 'TIME'
              WHEN data_type = 'date' THEN 'DATE'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'uuid' THEN 'UUID'
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
            ', '
          ) || ');' as create_statement
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        GROUP BY table_name
      `, [tableName]);
      
      if (createResult.rows.length > 0) {
        const createSQL = createResult.rows[0].create_statement;
        console.log(`    SQL: ${createSQL.substring(0, 100)}...`);
        await targetClient.query(createSQL);
      }
    }
    
    // Step 4: Copy data
    console.log('\n📋 Copying data...');
    for (const tableName of tables) {
      console.log(`  Copying data for ${tableName}...`);
      
      const dataResult = await sourceClient.query(`SELECT * FROM "${tableName}"`);
      
      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        for (const row of dataResult.rows) {
          const values = columns.map(col => row[col]);
          await targetClient.query(`
            INSERT INTO "${tableName}" (${columnNames}) 
            VALUES (${placeholders})
          `, values);
        }
        
        console.log(`    Copied ${dataResult.rows.length} rows`);
      } else {
        console.log(`    No data to copy`);
      }
    }
    
    console.log('\n🎉 Simple copy completed successfully!');
    
  } catch (error) {
    console.error('❌ Copy failed:', error);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

simpleCopy()
  .then(() => {
    console.log('\n✅ Simple copy script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Simple copy script failed:', error);
    process.exit(1);
  });
