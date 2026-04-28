/**
 * Quick sanity check for the DB your app uses vs what you see in Railway/Data tab.
 *   $env:DATABASE_URL = 'postgresql://...'
 *   node scripts/db-inspect.js
 */
const { Client } = require('pg')

async function main() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('Set DATABASE_URL')
    process.exit(1)
  }
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  await client.connect()

  const db = await client.query(
    'SELECT current_database() AS db, inet_server_addr() AS server_addr, inet_server_port() AS port'
  )
  console.log('Host connection → database:', db.rows[0])

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  console.log('public tables count:', tables.rows.length)
  const names = tables.rows.map((r) => r.table_name)
  console.log('has employees?', names.includes('employees'))

  if (names.includes('employees')) {
    const n = await client.query('SELECT COUNT(*)::int AS n FROM employees')
    console.log('employees row count:', n.rows[0].n)
    const sample = await client.query(
      `SELECT email, role, tenant_id FROM employees ORDER BY created_at NULLS LAST LIMIT 5`
    )
    console.log('sample employees:', sample.rows)
  } else {
    console.log('First 20 table names:', names.slice(0, 20))
  }

  await client.end()
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
