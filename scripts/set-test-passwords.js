// Set known test passwords for selected employees using the app's base64 hashing
// Usage: node scripts/set-test-passwords.js

const { Pool } = require('pg')

const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: { rejectUnauthorized: false }
})

function hashPasswordBase64(password) {
  return Buffer.from(password).toString('base64')
}

async function setPasswords() {
  const client = await pool.connect()
  try {
    console.log('Setting known test passwords...')
    const targets = [
      { employee_id: 'EMP001', password: 'john123' },
      { employee_id: 'EMP002', password: 'jane123' },
      { employee_id: 'EMP003', password: 'mike123' },
      { employee_id: 'EMP015', password: 'usama123' },
      { employee_id: 'EMP200', password: 'teamlead123' },
    ]

    for (const t of targets) {
      const hash = hashPasswordBase64(t.password)
      const res = await client.query(
        `UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE employee_id = $2 RETURNING employee_id`,
        [hash, t.employee_id]
      )
      if (res.rowCount > 0) {
        console.log(`- ${t.employee_id} set to ${t.password}`)
      } else {
        console.warn(`- ${t.employee_id} not found`)
      }
    }
    console.log('Done.')
  } finally {
    client.release()
    await pool.end()
  }
}

setPasswords().catch((e) => { console.error(e); process.exit(1) })


