const { Pool } = require('pg');
const fs = require('fs');

// Source (DEV) and Target (NEW) database connections
const sourcePool = new Pool({
  connectionString: 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
  ssl: { rejectUnauthorized: false }
});

const targetPool = new Pool({
  connectionString: 'postgresql://postgres:IImsWCOMgonNsYLXSDBUGsrpbGNbbsoZ@hopper.proxy.rlwy.net:48063/railway',
  ssl: { rejectUnauthorized: false }
});

async function copyDatabase() {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  
  try {
    console.log('🔄 Starting database copy from DEV to NEW...\n');
    
    // Step 1: Get all table names from source
    console.log('📋 Step 1: Getting table list from source database...');
    const tablesResult = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables: ${tables.join(', ')}\n`);
    
    // Step 2: Get schema for each table
    console.log('📋 Step 2: Getting table schemas...');
    const schemas = {};
    
    for (const tableName of tables) {
      console.log(`  Getting schema for ${tableName}...`);
      
      // Get column definitions
      const columnsResult = await sourceClient.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      // Get constraints
      const constraintsResult = await sourceClient.query(`
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = $1 AND tc.table_schema = 'public'
      `, [tableName]);
      
      schemas[tableName] = {
        columns: columnsResult.rows,
        constraints: constraintsResult.rows
      };
    }
    
    // Step 3: Drop and recreate tables in target
    console.log('\n📋 Step 3: Recreating tables in target database...');
    
    // Drop all existing tables in target (in reverse dependency order)
    const dropOrder = [...tables].reverse();
    for (const tableName of dropOrder) {
      console.log(`  Dropping table ${tableName}...`);
      await targetClient.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
    }
    
    // Create tables
    for (const tableName of tables) {
      console.log(`  Creating table ${tableName}...`);
      const schema = schemas[tableName];
      
      // Build CREATE TABLE statement
      let createSQL = `CREATE TABLE "${tableName}" (\n`;
      const columnDefs = schema.columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision && col.numeric_scale) {
          def += `(${col.numeric_precision},${col.numeric_scale})`;
        } else if (col.numeric_precision) {
          def += `(${col.numeric_precision})`;
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        return def;
      });
      
      createSQL += columnDefs.join(',\n');
      createSQL += '\n)';
      
      await targetClient.query(createSQL);
      
      // Add constraints
      for (const constraint of schema.constraints) {
        if (constraint.constraint_type === 'PRIMARY KEY') {
          await targetClient.query(`
            ALTER TABLE "${tableName}" 
            ADD CONSTRAINT "${constraint.constraint_name}" 
            PRIMARY KEY ("${constraint.column_name}")
          `);
        } else if (constraint.constraint_type === 'FOREIGN KEY') {
          await targetClient.query(`
            ALTER TABLE "${tableName}" 
            ADD CONSTRAINT "${constraint.constraint_name}" 
            FOREIGN KEY ("${constraint.column_name}") 
            REFERENCES "${constraint.foreign_table_name}" ("${constraint.foreign_column_name}")
          `);
        } else if (constraint.constraint_type === 'UNIQUE') {
          await targetClient.query(`
            ALTER TABLE "${tableName}" 
            ADD CONSTRAINT "${constraint.constraint_name}" 
            UNIQUE ("${constraint.column_name}")
          `);
        }
      }
    }
    
    // Step 4: Copy data
    console.log('\n📋 Step 4: Copying data...');
    
    for (const tableName of tables) {
      console.log(`  Copying data for ${tableName}...`);
      
      // Get all data from source
      const dataResult = await sourceClient.query(`SELECT * FROM "${tableName}"`);
      
      if (dataResult.rows.length > 0) {
        // Get column names
        const columns = Object.keys(dataResult.rows[0]);
        const columnNames = columns.map(col => `"${col}"`).join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Insert data in batches
        const batchSize = 1000;
        for (let i = 0; i < dataResult.rows.length; i += batchSize) {
          const batch = dataResult.rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => row[col]);
            await targetClient.query(`
              INSERT INTO "${tableName}" (${columnNames}) 
              VALUES (${placeholders})
            `, values);
          }
        }
        
        console.log(`    Copied ${dataResult.rows.length} rows`);
      } else {
        console.log(`    No data to copy`);
      }
    }
    
    // Step 5: Copy indexes
    console.log('\n📋 Step 5: Copying indexes...');
    
    for (const tableName of tables) {
      const indexesResult = await sourceClient.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = $1 AND schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      `, [tableName]);
      
      for (const index of indexesResult.rows) {
        console.log(`  Creating index ${index.indexname} on ${tableName}...`);
        try {
          await targetClient.query(index.indexdef);
        } catch (err) {
          console.log(`    Warning: Could not create index ${index.indexname}: ${err.message}`);
        }
      }
    }
    
    // Step 6: Copy sequences and update their values
    console.log('\n📋 Step 6: Updating sequences...');
    
    const sequencesResult = await sourceClient.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const seq of sequencesResult.rows) {
      const seqName = seq.sequence_name;
      console.log(`  Updating sequence ${seqName}...`);
      
      // Get current value from source
      const sourceValue = await sourceClient.query(`SELECT last_value FROM "${seqName}"`);
      
      // Update target sequence
      await targetClient.query(`SELECT setval('"${seqName}"', $1)`, [sourceValue.rows[0].last_value]);
    }
    
    console.log('\n🎉 Database copy completed successfully!');
    console.log(`✅ Copied ${tables.length} tables from DEV to NEW database`);
    
  } catch (error) {
    console.error('❌ Database copy failed:', error);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
    await sourcePool.end();
    await targetPool.end();
  }
}

// Run the copy
copyDatabase()
  .then(() => {
    console.log('\n✅ Database copy script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Database copy script failed:', error);
    process.exit(1);
  });
