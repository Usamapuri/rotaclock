// Lightweight SQL file runner using node-postgres
// Usage:
//   node scripts/run-sql-file.js --conn "postgresql://user:pass@host:port/db" --file path/to/file.sql
// Or set env DATABASE_URL and pass only --file

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--conn' || arg === '-c') {
      args.conn = argv[++i]
    } else if (arg === '--file' || arg === '-f') {
      args.file = argv[++i]
    } else if (arg === '--help' || arg === '-h') {
      args.help = true
    }
  }
  return args
}

async function run() {
  const { conn, file, help } = parseArgs(process.argv)
  if (help || !file) {
    console.log('Usage: node scripts/run-sql-file.js --conn "postgresql://..." --file path/to/file.sql')
    console.log('       Or set DATABASE_URL env var and pass only --file')
    process.exit(help ? 0 : 1)
  }

  const connectionString = conn || process.env.DATABASE_URL
  if (!connectionString) {
    console.error('Error: No connection string provided. Use --conn or set DATABASE_URL')
    process.exit(1)
  }

  const sqlPath = path.resolve(file)
  if (!fs.existsSync(sqlPath)) {
    console.error(`Error: SQL file not found: ${sqlPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  if (!sql || !sql.trim()) {
    console.error('Error: SQL file is empty')
    process.exit(1)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  const start = Date.now()
  try {
    await client.connect()
    console.log(`Connected. Executing ${path.basename(sqlPath)} ...`)
    await client.query(sql)
    const elapsedMs = Date.now() - start
    console.log(`Success: ${path.basename(sqlPath)} executed in ${elapsedMs}ms`)
    process.exit(0)
  } catch (err) {
    console.error('Execution failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(2)
  } finally {
    try { await client.end() } catch (_) {}
  }
}

run()


