// Team Lead schema migration runner
// Usage: node scripts/run-teamlead-migrations.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
    ssl: { rejectUnauthorized: false }
  })
  const client = await pool.connect()
  try {
    console.log('Connecting to database...')
    await client.query('SELECT 1')

    const files = [
      'create-teams-and-teamlead.sql',
      'create-performance-metrics.sql',
      'create-project-manager.sql',
      'create-projects.sql',
    ]
    for (const file of files) {
      const sqlPath = path.join(__dirname, file)
      if (fs.existsSync(sqlPath)) {
        console.log('Applying SQL from:', sqlPath)
        const sql = fs.readFileSync(sqlPath, 'utf8')
        await client.query(sql)
      } else {
        console.log('Skip (not found):', sqlPath)
      }
    }

    console.log('Team Lead schema migration completed successfully.')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

run()
