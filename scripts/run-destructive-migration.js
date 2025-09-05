const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway',
    ssl: { rejectUnauthorized: false },
  })

  const client = await pool.connect()
  try {
    const migrationPath = path.join(__dirname, 'destructive_consolidation_migration.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    console.log('🚀 Running destructive consolidation migration...')
    await client.query(sql)
    console.log('✅ Migration completed successfully.')
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main()


