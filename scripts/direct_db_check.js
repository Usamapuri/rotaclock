const { Client } = require('pg')

async function runChecks(conn) {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const q = async (sql) => {
    const res = await client.query(sql)
    console.log('---')
    console.log(sql)
    console.log(JSON.stringify(res.rows, null, 2))
  }
  await q(`SELECT id, tenant_id, name, slug FROM organizations ORDER BY created_at DESC LIMIT 10`)
  await q(`SELECT id, email, role, tenant_id FROM employees ORDER BY created_at DESC LIMIT 50`)
  await q(`SELECT manager_id, location_id, tenant_id FROM manager_locations ORDER BY created_at DESC LIMIT 100`)
  await q(`SELECT id, name, is_active, tenant_id FROM locations ORDER BY name LIMIT 100`)
  await q(`SELECT tenant_id, location_id, COUNT(*) FROM employees GROUP BY tenant_id, location_id ORDER BY COUNT(*) DESC NULLS LAST`)
  await client.end()
}

if (require.main === module) {
  const conn = process.argv[2]
  if (!conn) {
    console.error('Usage: node scripts/direct_db_check.js <connection-string>')
    process.exit(1)
  }
  runChecks(conn).catch((e) => { console.error(e); process.exit(1) })
}

module.exports = { runChecks }

 