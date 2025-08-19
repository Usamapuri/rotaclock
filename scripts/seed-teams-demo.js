// Seed two demo teams and assign members
// Usage: node scripts/seed-teams-demo.js

require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function getEmployeeByEmpId(client, empId) {
  const r = await client.query('SELECT * FROM employees WHERE employee_id = $1 AND is_active = true', [empId])
  return r.rows[0] || null
}

async function ensureTeam(client, { name, department, description, teamLeadId }) {
  const existing = await client.query('SELECT * FROM teams WHERE name = $1', [name])
  if (existing.rows.length > 0) {
    const t = existing.rows[0]
    if (teamLeadId && t.team_lead_id !== teamLeadId) {
      await client.query('UPDATE teams SET team_lead_id = $1, updated_at = NOW() WHERE id = $2', [teamLeadId, t.id])
      t.team_lead_id = teamLeadId
    }
    return t
  }
  const ins = await client.query(
    `INSERT INTO teams (name, department, description, team_lead_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, department || null, description || null, teamLeadId || null]
  )
  return ins.rows[0]
}

async function assignMembersToTeam(client, teamId, employeeIds) {
  for (const eid of employeeIds) {
    await client.query('UPDATE employees SET team_id = $1, updated_at = NOW() WHERE id = $2', [teamId, eid])
    await client.query(
      `INSERT INTO team_assignments (employee_id, team_id, assigned_date, is_active)
       VALUES ($1,$2,CURRENT_DATE,true)
       ON CONFLICT (employee_id, team_id, assigned_date) DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()`,
      [eid, teamId]
    )
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway'
  const isLocal = /localhost|127\.0\.0\.1/i.test(connectionString)
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  })
  const client = await pool.connect()
  try {
    console.log('Seeding demo teams...')
    // Choose two leads that exist in seed data
    const leadA = await getEmployeeByEmpId(client, 'EMP200') // Sameer
    const leadB = await getEmployeeByEmpId(client, 'EMP015') // Usama
    if (!leadA || !leadB) throw new Error('Required leads not found (EMP200, EMP015)')

    // Ensure their role is team_lead
    await client.query("UPDATE employees SET role = 'team_lead' WHERE id = $1", [leadA.id])
    await client.query("UPDATE employees SET role = 'team_lead' WHERE id = $1", [leadB.id])

    // Create teams
    const team1 = await ensureTeam(client, {
      name: 'Take Me Taxi',
      department: 'Operations',
      description: 'Project: Take Me Taxi',
      teamLeadId: leadA.id,
    })
    const team2 = await ensureTeam(client, {
      name: 'Cab Call Experts',
      department: 'Operations',
      description: 'Project: Cab Call Experts',
      teamLeadId: leadB.id,
    })

    // Pick 6 active employees (excluding leads) for team1
    const membersRes = await client.query(
      `SELECT id FROM employees 
       WHERE is_active = true AND id NOT IN ($1,$2)
       ORDER BY created_at ASC LIMIT 6`,
      [leadA.id, leadB.id]
    )
    const memberIds = membersRes.rows.map(r => r.id)
    if (memberIds.length < 6) console.warn('Warning: found less than 6 employees to assign')
    await assignMembersToTeam(client, team1.id, memberIds)

    // Optionally assign a few members to team2 (rest 4)
    const moreMembersRes = await client.query(
      `SELECT id FROM employees 
       WHERE is_active = true AND id NOT IN ($1,$2,${memberIds.map((_,i)=>`$${i+3}`).join(',')})
       ORDER BY created_at ASC LIMIT 4`,
      [leadA.id, leadB.id, ...memberIds]
    )
    const memberIds2 = moreMembersRes.rows.map(r => r.id)
    if (memberIds2.length > 0) await assignMembersToTeam(client, team2.id, memberIds2)

    console.log('Done.')
    console.log('Team 1:', team1.name, team1.id)
    console.log('Team 2:', team2.name, team2.id)

    // Ensure a sample Project Manager and mappings
    const pm = await getEmployeeByEmpId(client, 'EMP300')
    if (pm) {
      await client.query("UPDATE employees SET role = 'project_manager' WHERE id = $1", [pm.id])
      // Ensure a demo project and map both teams to it
      const projIns = await client.query(
        `INSERT INTO projects (name, description)
           VALUES ($1,$2)
           ON CONFLICT DO NOTHING
           RETURNING *`,
        ['Demo Project A', 'Aggregates demo teams']
      )
      const project = projIns.rows[0] || (await client.query('SELECT * FROM projects WHERE name = $1', ['Demo Project A'])).rows[0]
      await client.query('UPDATE teams SET project_id = $1 WHERE id IN ($2,$3)', [project.id, team1.id, team2.id])
      await client.query(
        `INSERT INTO manager_projects (manager_id, project_id)
         VALUES ($1,$2)
         ON CONFLICT (manager_id, project_id) DO UPDATE SET updated_at = NOW()`,
        [pm.id, project.id]
      )
      await client.query(
        `INSERT INTO manager_teams (manager_id, team_id)
         VALUES ($1,$2)
         ON CONFLICT (manager_id, team_id) DO UPDATE SET updated_at = NOW()`,
        [pm.id, team1.id]
      )
      await client.query(
        `INSERT INTO manager_teams (manager_id, team_id)
         VALUES ($1,$2)
         ON CONFLICT (manager_id, team_id) DO UPDATE SET updated_at = NOW()`,
        [pm.id, team2.id]
      )
      console.log('Assigned PM EMP300 to both teams')
    } else {
      console.log('Optional: create employee EMP300 to demo Project Manager')
    }
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })


