import { readFile } from 'node:fs/promises'
import { Client } from 'pg'

async function run() {
  const [,, file, urlArg] = process.argv
  const url = urlArg || process.env.DATABASE_URL
  if (!file) {
    console.error('Usage: node scripts/run-sql.mjs <path/to/file.sql> [DATABASE_URL]')
    process.exit(1)
  }
  if (!url) {
    console.error('DATABASE_URL is required (env or arg)')
    process.exit(1)
  }

  const sql = await readFile(file, 'utf8')
  console.log(`Running SQL file: ${file}`)

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(sql)
    console.log('SQL executed successfully')
  } finally {
    await client.end()
  }
}

run().catch(err => { console.error('SQL run error:', err); process.exit(1) })


