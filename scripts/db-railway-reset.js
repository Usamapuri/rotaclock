/**
 * Full reset: DROP public schema, re-apply database-schema.sql (statement-by-statement), seed.
 * Usage (PowerShell):
 *   $env:DATABASE_URL = 'postgresql://...'
 *   node scripts/db-railway-reset.js
 *
 * Statement splitting avoids drivers that mishandle very large multi-statement strings
 * and yields clearer errors (statement index) if something fails mid-file.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { splitPgStatements } = require('./pg-split-statements')

function isSkippableStatement(sql) {
  const t = sql.trim()
  if (!t) return true
  const lines = t.split('\n').map((l) => l.trim()).filter(Boolean)
  return lines.length > 0 && lines.every((l) => l.startsWith('--'))
}

async function main() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('Set DATABASE_URL to your Postgres connection string.')
    process.exit(1)
  }

  const root = path.join(__dirname, '..')
  const schemaPath = path.join(root, 'database-schema.sql')
  const seedPath = path.join(__dirname, 'db-seed-railway.sql')

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  })

  console.log('Connecting...')
  await client.connect()

  const dbInfo = await client.query('SELECT current_database() AS db, current_user AS user')
  console.log('Connected to database:', dbInfo.rows[0].db, 'as', dbInfo.rows[0].user)

  console.log('Dropping and recreating schema public...')
  await client.query('DROP SCHEMA IF EXISTS public CASCADE')
  await client.query('CREATE SCHEMA public')
  await client.query('GRANT ALL ON SCHEMA public TO postgres')
  await client.query('GRANT ALL ON SCHEMA public TO public')

  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
  const stmts = splitPgStatements(schemaSql).filter((s) => !isSkippableStatement(s))
  console.log('Applying database-schema.sql:', stmts.length, 'statements...')

  let applied = 0
  for (let i = 0; i < stmts.length; i++) {
    const st = stmts[i]
    const preview = st.replace(/\s+/g, ' ').slice(0, 72)
    try {
      await client.query(st)
      applied++
    } catch (e) {
      console.error(`Schema failed at statement ${i + 1}/${stmts.length}:`, preview + (st.length > 72 ? '…' : ''))
      console.error(e.message || e)
      await client.end().catch(() => {})
      process.exit(1)
    }
  }
  console.log('Schema statements applied:', applied)

  const seedSql = fs.readFileSync(seedPath, 'utf8')
  const seedStmts = splitPgStatements(seedSql).filter((s) => !isSkippableStatement(s))
  console.log('Applying demo seed:', seedStmts.length, 'statements...')
  for (let i = 0; i < seedStmts.length; i++) {
    try {
      await client.query(seedStmts[i])
    } catch (e) {
      console.error(`Seed failed at statement ${i + 1}/${seedStmts.length}`)
      console.error(e.message || e)
      await client.end().catch(() => {})
      process.exit(1)
    }
  }

  const check = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS n_tables,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') AS has_employees,
      (SELECT COUNT(*)::int FROM employees) AS n_employees
  `)
  const r = check.rows[0]
  console.log('Verification:', {
    publicTables: r.n_tables,
    hasEmployeesTable: r.has_employees,
    employeeRows: r.n_employees,
  })

  if (!r.has_employees) {
    console.error('employees table missing after reset — check DATABASE_URL targets the intended Postgres instance.')
    await client.end().catch(() => {})
    process.exit(1)
  }

  await client.end()
  console.log('Done. Demo logins (password: password123):')
  console.log('  Admin:  admin@rotaclock.local')
  console.log('  Agent:  agent@rotaclock.local')
  console.log('Tenant id: rotaclock-main')
}

main().catch((err) => {
  console.error('Reset failed:', err.message || err)
  process.exit(1)
})
