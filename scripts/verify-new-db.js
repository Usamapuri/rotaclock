const { Pool } = require('pg');

const conn = process.env.DATABASE_URL
if (!conn) {
  console.error('Set DATABASE_URL')
  process.exit(1)
}

async function run() {
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    console.log('🔎 Verifying NEW Railway database...')
    const tablesRes = await client.query("SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
    console.log('Tables:', tablesRes.rows[0].n)

    const counts = await client.query(`
      SELECT 'employees' AS tbl, tenant_id, COUNT(*)::int AS cnt FROM employees GROUP BY tenant_id
      UNION ALL
      SELECT 'shift_assignments' AS tbl, tenant_id, COUNT(*)::int FROM shift_assignments GROUP BY tenant_id
      UNION ALL
      SELECT 'time_entries' AS tbl, tenant_id, COUNT(*)::int FROM time_entries GROUP BY tenant_id
      ORDER BY tbl, tenant_id
    `)
    console.log('Tenant counts:')
    counts.rows.forEach(r => console.log(`${r.tbl}: ${r.tenant_id}=${r.cnt}`))
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(err => { console.error('Error verifying NEW DB:', err); process.exit(1) })
