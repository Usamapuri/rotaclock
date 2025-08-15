// Seed today's performance_metrics for all members of a given team
// Usage: node scripts/seed-today-metrics.js <teamId>

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function main() {
  const teamId = process.argv[2]
  if (!teamId) {
    console.error('Usage: node scripts/seed-today-metrics.js <teamId>')
    process.exit(1)
  }
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway'
  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString)
  const pool = new Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    const members = await client.query('SELECT id FROM employees WHERE team_id = $1 AND is_active = true', [teamId])
    const today = new Date().toISOString().slice(0,10)
    for (const row of members.rows) {
      const calls = Math.floor(Math.random() * 30)
      const aht = 180 + Math.floor(Math.random() * 120)
      const csat = (3 + Math.random() * 2).toFixed(2)
      const fcr = (80 + Math.random() * 20).toFixed(2)
      await client.query(
        `INSERT INTO performance_metrics (
          employee_id, date, calls_handled, avg_handle_time, customer_satisfaction, first_call_resolution_rate,
          total_break_time, total_work_time, productivity_score, quality_score
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (employee_id, date) DO UPDATE SET 
          calls_handled = EXCLUDED.calls_handled,
          avg_handle_time = EXCLUDED.avg_handle_time,
          customer_satisfaction = EXCLUDED.customer_satisfaction,
          first_call_resolution_rate = EXCLUDED.first_call_resolution_rate,
          total_break_time = EXCLUDED.total_break_time,
          total_work_time = EXCLUDED.total_work_time,
          productivity_score = EXCLUDED.productivity_score,
          quality_score = EXCLUDED.quality_score,
          updated_at = NOW()`,
        [row.id, today, calls, aht, csat, fcr, 30, 8*60,  (calls/ (aht||1)).toFixed(2),  csat]
      )
    }
    console.log(`Seeded metrics for ${members.rowCount} members of team ${teamId} (${today})`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })


