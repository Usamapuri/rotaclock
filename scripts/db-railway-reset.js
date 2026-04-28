/**
 * Full reset: DROP public schema, re-apply database-schema.sql, run demo seed.
 * Usage (PowerShell):
 *   $env:DATABASE_URL = 'postgresql://...'
 *   node scripts/db-railway-reset.js
 *
 * Requires: pg (project dependency), Railway Postgres with SSL.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

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

  console.log('Dropping and recreating schema public...')
  await client.query('DROP SCHEMA IF EXISTS public CASCADE')
  await client.query('CREATE SCHEMA public')
  await client.query('GRANT ALL ON SCHEMA public TO postgres')
  await client.query('GRANT ALL ON SCHEMA public TO public')

  const schemaSql = fs.readFileSync(schemaPath, 'utf8')
  console.log('Applying database-schema.sql (' + Math.round(schemaSql.length / 1024) + ' KB)...')
  await client.query(schemaSql)

  const seedSql = fs.readFileSync(seedPath, 'utf8')
  console.log('Applying demo seed...')
  await client.query(seedSql)

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
