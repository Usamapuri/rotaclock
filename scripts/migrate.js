/**
 * Ordered, tracked SQL migration runner.
 *
 * Applies scripts/migrations/NNN_*.sql files that haven't been applied yet,
 * recording each in a schema_migrations table. Each migration runs in its own
 * transaction, so a failure rolls back cleanly and stops the run.
 *
 * Reads DATABASE_URL from the environment — never hardcode credentials.
 * Migrations should be written idempotently (CREATE ... IF NOT EXISTS,
 * ADD COLUMN IF NOT EXISTS, etc.) so re-running is always safe.
 *
 * Usage:
 *   node scripts/migrate.js            # apply pending migrations
 *   node scripts/migrate.js --status   # list applied + pending
 *   node scripts/migrate.js --baseline # record all as applied WITHOUT running
 *                                       # (used by db:railway-reset, whose
 *                                       #  canonical schema already includes them)
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

function migrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+.*\.sql$/.test(f))
    .sort()
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function appliedVersions(client) {
  const res = await client.query('SELECT version FROM schema_migrations')
  return new Set(res.rows.map((r) => r.version))
}

/** Record every migration file as applied without executing it. */
async function baselineMigrations(client) {
  await ensureMigrationsTable(client)
  const files = migrationFiles()
  for (const file of files) {
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [file]
    )
  }
  return files
}

/** Apply all pending migrations in order. Returns the list applied. */
async function applyMigrations(client, { log = () => {} } = {}) {
  await ensureMigrationsTable(client)
  const done = await appliedVersions(client)
  const pending = migrationFiles().filter((f) => !done.has(f))
  const appliedNow = []
  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    log(`Applying ${file} ...`)
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file])
      await client.query('COMMIT')
      appliedNow.push(file)
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw new Error(`Migration ${file} failed: ${e.message || e}`)
    }
  }
  return appliedNow
}

async function main() {
  const conn = process.env.DATABASE_URL
  if (!conn) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }
  const mode = process.argv[2]
  const client = new Client({
    connectionString: conn,
    ssl: conn.includes('localhost') ? false : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    if (mode === '--status') {
      await ensureMigrationsTable(client)
      const done = await appliedVersions(client)
      const files = migrationFiles()
      console.log('Migrations:')
      for (const f of files) console.log(`  [${done.has(f) ? 'x' : ' '}] ${f}`)
      const pending = files.filter((f) => !done.has(f))
      console.log(pending.length ? `${pending.length} pending.` : 'Up to date.')
      return
    }
    if (mode === '--baseline') {
      const files = await baselineMigrations(client)
      console.log(`Baselined ${files.length} migration(s) as applied (not executed).`)
      return
    }
    const applied = await applyMigrations(client, { log: (m) => console.log(m) })
    console.log(applied.length ? `Applied ${applied.length} migration(s).` : 'No pending migrations.')
  } finally {
    await client.end()
  }
}

module.exports = { ensureMigrationsTable, appliedVersions, applyMigrations, baselineMigrations, migrationFiles }

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })
}
