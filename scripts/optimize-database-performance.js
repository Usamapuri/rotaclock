const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function optimizeDatabasePerformance() {
  try {
    console.log('🚀 Starting database performance optimization...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-performance-indexes.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      // Skip verification queries for now
      if (statement.includes('SELECT') && (statement.includes('pg_indexes') || statement.includes('pg_tables'))) {
        continue
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        await pool.query(statement)
        console.log(`✅ Statement ${i + 1} completed successfully`)
      } catch (error) {
        if (error.code === '42710') {
          // Index already exists, this is fine
          console.log(`ℹ️  Statement ${i + 1}: Index already exists (skipped)`)
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message)
        }
      }
    }
    
    // Now run verification queries
    console.log('\n🔍 Running verification queries...')
    
    // Check indexes
    const indexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('employees', 'teams', 'shift_assignments', 'shift_swaps', 'leave_requests')
      ORDER BY tablename, indexname
    `)
    
    console.log('\n📊 Current indexes:')
    indexesResult.rows.forEach(row => {
      console.log(`  ${row.tablename}.${row.indexname}`)
    })
    
    // Check table sizes
    const sizesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `)
    
    console.log('\n📏 Table sizes:')
    sizesResult.rows.forEach(row => {
      console.log(`  ${row.tablename}: ${row.size}`)
    })
    
    // Test the slow query that was causing issues
    console.log('\n🧪 Testing the previously slow query...')
    const startTime = Date.now()
    
    const testResult = await pool.query(`
      SELECT id, employee_id, email, role 
      FROM employees 
      WHERE id = $1 AND is_active = true
    `, ['555e2e86-36c9-4a86-a11d-83bc2af20b04'])
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`⏱️  Query execution time: ${duration}ms`)
    console.log(`📋 Found ${testResult.rows.length} records`)
    
    if (duration < 100) {
      console.log('✅ Query is now fast! (< 100ms)')
    } else if (duration < 500) {
      console.log('⚠️  Query is acceptable (< 500ms)')
    } else {
      console.log('❌ Query is still slow (> 500ms)')
    }
    
    console.log('\n🎉 Database performance optimization completed!')
    console.log('The slow query warnings should now be resolved.')
    
  } catch (error) {
    console.error('❌ Error optimizing database performance:', error)
  } finally {
    await pool.end()
  }
}

// Run the optimization
optimizeDatabasePerformance()
  .then(() => {
    console.log('\n✅ Database optimization script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
