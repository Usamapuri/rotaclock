const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function monitorSlowQueries() {
  try {
    console.log('🔍 Database Performance Monitor')
    console.log('================================')
    
    // Check PostgreSQL version and settings
    const versionResult = await pool.query('SELECT version()')
    console.log('\n📋 PostgreSQL Version:', versionResult.rows[0].version.split(' ')[1])
    
    // Check current database statistics
    const statsResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `)
    
    console.log('\n📊 Table Statistics:')
    statsResult.rows.forEach(row => {
      console.log(`  ${row.tablename}:`)
      console.log(`    Live rows: ${row.live_rows}`)
      console.log(`    Dead rows: ${row.dead_rows}`)
      console.log(`    Last vacuum: ${row.last_vacuum || 'Never'}`)
      console.log(`    Last analyze: ${row.last_analyze || 'Never'}`)
    })
    
    // Check index usage statistics
    const indexStatsResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `)
    
    console.log('\n🔍 Index Usage Statistics:')
    indexStatsResult.rows.forEach(row => {
      console.log(`  ${row.tablename}.${row.indexname}: ${row.scans} scans`)
    })
    
    // Check for unused indexes
    const unusedIndexesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public' 
        AND idx_scan = 0
      ORDER BY tablename, indexname
    `)
    
    if (unusedIndexesResult.rows.length > 0) {
      console.log('\n⚠️  Unused Indexes (consider removing):')
      unusedIndexesResult.rows.forEach(row => {
        console.log(`  ${row.tablename}.${row.indexname}`)
      })
    } else {
      console.log('\n✅ No unused indexes found')
    }
    
    // Check for tables that need vacuuming
    const vacuumNeededResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        n_dead_tup,
        n_live_tup,
        ROUND((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) * 100), 2) as dead_percentage
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
        AND n_dead_tup > 0
      ORDER BY dead_percentage DESC
    `)
    
    if (vacuumNeededResult.rows.length > 0) {
      console.log('\n🧹 Tables that may need VACUUM:')
      vacuumNeededResult.rows.forEach(row => {
        console.log(`  ${row.tablename}: ${row.dead_percentage}% dead tuples (${row.n_dead_tup} dead, ${row.n_live_tup} live)`)
      })
    } else {
      console.log('\n✅ All tables are clean (no dead tuples)')
    }
    
    // Test common queries for performance
    console.log('\n🧪 Performance Test Results:')
    
    const testQueries = [
      {
        name: 'Employee lookup by ID',
        query: 'SELECT id, employee_id, email, role FROM employees WHERE id = $1 AND is_active = true',
        params: ['555e2e86-36c9-4a86-a11d-83bc2af20b04']
      },
      {
        name: 'Team lookup by lead',
        query: 'SELECT t.* FROM teams t WHERE t.team_lead_id = $1 AND t.is_active = true',
        params: ['555e2e86-36c9-4a86-a11d-83bc2af20b04']
      },
      {
        name: 'Team members lookup',
        query: 'SELECT e.* FROM employees e WHERE e.team_id = $1 AND e.is_active = true',
        params: ['384264cf-b4e1-408c-b56e-b6ce9d14b7ce']
      },
      {
        name: 'Leave requests by team',
        query: `
          SELECT lr.*, e.first_name, e.last_name, e.email 
          FROM leave_requests lr
          LEFT JOIN employees e ON lr.employee_id = e.id
          WHERE e.team_id = $1
        `,
        params: ['384264cf-b4e1-408c-b56e-b6ce9d14b7ce']
      }
    ]
    
    for (const test of testQueries) {
      const startTime = Date.now()
      const result = await pool.query(test.query, test.params)
      const duration = Date.now() - startTime
      
      console.log(`  ${test.name}: ${duration}ms (${result.rows.length} rows)`)
      
      if (duration > 100) {
        console.log(`    ⚠️  Slow query detected!`)
      }
    }
    
    // Recommendations
    console.log('\n💡 Performance Recommendations:')
    
    if (vacuumNeededResult.rows.length > 0) {
      console.log('  1. Run VACUUM ANALYZE on tables with dead tuples')
    }
    
    if (unusedIndexesResult.rows.length > 0) {
      console.log('  2. Consider removing unused indexes to improve write performance')
    }
    
    console.log('  3. Monitor query performance in production logs')
    console.log('  4. Consider implementing query result caching for frequently accessed data')
    console.log('  5. Use connection pooling (already implemented)')
    
    console.log('\n✅ Performance monitoring completed')
    
  } catch (error) {
    console.error('❌ Error monitoring performance:', error)
  } finally {
    await pool.end()
  }
}

// Run the monitoring
monitorSlowQueries()
  .then(() => {
    console.log('\n✅ Performance monitoring script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
