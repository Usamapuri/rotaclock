require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
    ssl: { rejectUnauthorized: false }
  })
  const client = await pool.connect()
  try {
    const empId = 'EMP300'
    const email = 'pm.demo@example.com'
    const first = 'Project'
    const last = 'Manager'
    const password = 'password123'

    // Ensure employee exists
    let emp = await client.query('SELECT * FROM employees WHERE employee_id = $1', [empId])
    if (emp.rows.length === 0) {
      const hash = Buffer.from(password).toString('base64')
      const ins = await client.query(
        `INSERT INTO employees (employee_id, first_name, last_name, email, is_active, password_hash, role)
         VALUES ($1,$2,$3,$4,true,$5,'project_manager') RETURNING *`,
        [empId, first, last, email, hash]
      )
      emp = { rows: [ins.rows[0]] }
    } else {
      await client.query("UPDATE employees SET role = 'project_manager' WHERE id = $1", [emp.rows[0].id])
    }
    const pmId = emp.rows[0].id

    // Ensure a project
    const projRes = await client.query(`SELECT * FROM projects ORDER BY created_at ASC LIMIT 1`)
    let project = projRes.rows[0]
    if (!project) {
      const newProj = await client.query(`INSERT INTO projects (name, description) VALUES ('Demo Project A', 'Demo PM Project') RETURNING *`)
      project = newProj.rows[0]
    }

    // Map PM to project
    await client.query(
      `INSERT INTO manager_projects (manager_id, project_id)
       VALUES ($1,$2)
       ON CONFLICT (manager_id, project_id) DO UPDATE SET updated_at = NOW()`,
      [pmId, project.id]
    )

    // Map PM to up to 2 teams in that project, or any teams
    const teams = (await client.query(`SELECT id FROM teams WHERE project_id = $1 OR $1 IS NULL LIMIT 2`, [project.id])).rows
    for (const t of teams) {
      await client.query(
        `INSERT INTO manager_teams (manager_id, team_id)
         VALUES ($1,$2)
         ON CONFLICT (manager_id, team_id) DO UPDATE SET updated_at = NOW()`,
        [pmId, t.id]
      )
    }
    console.log('Seeded PM demo EMP300 with project and team mappings.')
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })


