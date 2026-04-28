/**
 * One-time (or idempotent) platform super admin seed.
 * Requires DATABASE_URL and SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASSWORD in env.
 *
 * Usage: node scripts/seed-super-admin.js
 * Optional: SUPER_ADMIN_NAME="Platform Admin"
 */
require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const bcrypt = require('bcryptjs')
const { Client } = require('pg')

async function main() {
  const connectionString = process.env.DATABASE_URL
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.SUPER_ADMIN_PASSWORD || ''
  const fullName = process.env.SUPER_ADMIN_NAME || 'Platform Admin'

  if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }
  if (!email || !password) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to seed a super admin')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('SUPER_ADMIN_PASSWORD must be at least 8 characters')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    const existing = await client.query('SELECT id FROM super_admins WHERE LOWER(email) = LOWER($1)', [email])
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE super_admins SET password_hash = $2, full_name = $3, is_active = true, updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id, hash, fullName]
      )
      console.log('Updated existing super admin:', email)
    } else {
      const ins = await client.query(
        `INSERT INTO super_admins (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id`,
        [email, hash, fullName]
      )
      console.log('Created super admin:', email, 'id:', ins.rows[0].id)
    }
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
