/**
 * Reset / inspect RotaClock logins.
 *
 * Phase 2 made login bcrypt-only (no password123 fallback), so any account with
 * a NULL password_hash can no longer sign in. Use this to set a known password.
 *
 * Reads the connection string from DATABASE_URL — never hardcode credentials.
 *
 * Usage:
 *   node scripts/reset-login.js --list
 *   node scripts/reset-login.js <email> <newPassword>
 *   node scripts/reset-login.js --all <newPassword>
 *
 * Examples:
 *   node scripts/reset-login.js --list
 *   node scripts/reset-login.js admin@rotaclock.local password123
 *   node scripts/reset-login.js --all password123
 */
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Run with your Railway connection string, e.g.\n' +
    '  DATABASE_URL="postgresql://..." node scripts/reset-login.js --list')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
})

async function list(client) {
  const emps = await client.query(
    `SELECT email, role, tenant_id, is_active, (password_hash IS NOT NULL) AS has_password
     FROM employees ORDER BY role, email`
  )
  console.log('\nEMPLOYEES:')
  for (const r of emps.rows) {
    console.log(
      `  ${r.email.padEnd(34)} ${String(r.role).padEnd(16)} tenant=${r.tenant_id || '-'} ` +
      `${r.is_active ? 'active' : 'INACTIVE'} ${r.has_password ? 'has-pw' : 'NO-PASSWORD'}`
    )
  }
  try {
    const sa = await client.query(
      `SELECT email, is_active, (password_hash IS NOT NULL) AS has_password
       FROM super_admins ORDER BY email`
    )
    if (sa.rows.length) {
      console.log('\nSUPER ADMINS:')
      for (const r of sa.rows) {
        console.log(`  ${r.email.padEnd(34)} ${r.is_active ? 'active' : 'INACTIVE'} ${r.has_password ? 'has-pw' : 'NO-PASSWORD'}`)
      }
    }
  } catch {
    /* super_admins table may not exist */
  }
}

async function resetOne(client, email, hash) {
  const lower = email.trim().toLowerCase()
  const emp = await client.query(
    `UPDATE employees SET password_hash = $1, updated_at = NOW()
     WHERE LOWER(TRIM(email)) = $2 RETURNING email, role`,
    [hash, lower]
  )
  if (emp.rows.length > 0) {
    for (const r of emp.rows) console.log(`  reset employee ${r.email} (${r.role})`)
    return emp.rows.length
  }
  try {
    const sa = await client.query(
      `UPDATE super_admins SET password_hash = $1 WHERE LOWER(TRIM(email)) = $2 RETURNING email`,
      [hash, lower]
    )
    if (sa.rows.length > 0) {
      for (const r of sa.rows) console.log(`  reset super_admin ${r.email}`)
      return sa.rows.length
    }
  } catch {
    /* ignore */
  }
  return 0
}

async function resetAll(client, hash) {
  const res = await client.query(
    `UPDATE employees SET password_hash = $1, updated_at = NOW()
     WHERE is_active = true RETURNING email`,
    [hash]
  )
  console.log(`  reset ${res.rows.length} active employees`)
  return res.rows.length
}

async function main() {
  const [a, b] = process.argv.slice(2)
  const client = await pool.connect()
  try {
    if (!a || a === '--list') {
      await list(client)
      return
    }
    if (a === '--all') {
      if (!b) throw new Error('Provide a password: node scripts/reset-login.js --all <password>')
      const hash = await bcrypt.hash(b, 10)
      await resetAll(client, hash)
      console.log(`\nAll active employees can now log in with: ${b}`)
      return
    }
    // reset a single account
    if (!b) throw new Error('Provide a password: node scripts/reset-login.js <email> <password>')
    const hash = await bcrypt.hash(b, 10)
    const n = await resetOne(client, a, hash)
    if (n === 0) {
      console.error(`No account found for email "${a}". Use --list to see existing logins.`)
      process.exitCode = 1
    } else {
      console.log(`\n${a} can now log in with: ${b}`)
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error('reset-login failed:', err.message)
  process.exit(1)
})
