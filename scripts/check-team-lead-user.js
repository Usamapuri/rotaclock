const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkAndCreateTeamLead() {
  try {
    console.log('🔍 Checking for team lead user...')
    
    // Check if team lead exists
    const teamLeadResult = await pool.query(`
      SELECT id, employee_id, first_name, last_name, email, role, team_id
      FROM employees 
      WHERE role = 'team_lead' AND is_active = true
      LIMIT 1
    `)
    
    if (teamLeadResult.rows.length > 0) {
      const teamLead = teamLeadResult.rows[0]
      console.log('✅ Found existing team lead:', {
        id: teamLead.id,
        employee_id: teamLead.employee_id,
        name: `${teamLead.first_name} ${teamLead.last_name}`,
        email: teamLead.email,
        team_id: teamLead.team_id
      })
      
      // Check if team lead has a team
      if (teamLead.team_id) {
        const teamResult = await pool.query(`
          SELECT id, name, department, team_lead_id
          FROM teams 
          WHERE id = $1 AND is_active = true
        `, [teamLead.team_id])
        
        if (teamResult.rows.length > 0) {
          const team = teamResult.rows[0]
          console.log('✅ Team lead has assigned team:', {
            team_id: team.id,
            team_name: team.name,
            department: team.department
          })
        } else {
          console.log('⚠️  Team lead has team_id but team not found')
        }
      } else {
        console.log('⚠️  Team lead has no assigned team')
      }
      
      return teamLead
    } else {
      console.log('❌ No team lead found, creating one...')
      
      // Create a team lead user
      const teamLeadId = 'tl-' + Date.now()
      const teamLeadResult = await pool.query(`
        INSERT INTO employees (
          id, employee_id, first_name, last_name, email, role, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING *
      `, [
        teamLeadId,
        'TL001',
        'Test',
        'Team Lead',
        'tl@test.com',
        'team_lead',
        true
      ])
      
      const newTeamLead = teamLeadResult.rows[0]
      console.log('✅ Created team lead:', {
        id: newTeamLead.id,
        employee_id: newTeamLead.employee_id,
        name: `${newTeamLead.first_name} ${newTeamLead.last_name}`,
        email: newTeamLead.email
      })
      
      // Create a team for the team lead
      const teamId = 'team-' + Date.now()
      const teamResult = await pool.query(`
        INSERT INTO teams (
          id, name, department, team_lead_id, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, NOW(), NOW()
        ) RETURNING *
      `, [
        teamId,
        'Test Team',
        'Support',
        teamLeadId,
        true
      ])
      
      const newTeam = teamResult.rows[0]
      console.log('✅ Created team:', {
        id: newTeam.id,
        name: newTeam.name,
        department: newTeam.department,
        team_lead_id: newTeam.team_lead_id
      })
      
      // Update team lead with team_id
      await pool.query(`
        UPDATE employees 
        SET team_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [teamId, teamLeadId])
      
      console.log('✅ Updated team lead with team_id')
      
      return newTeamLead
    }
    
  } catch (error) {
    console.error('❌ Error checking/creating team lead:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run the function
checkAndCreateTeamLead()
  .then(() => {
    console.log('✅ Team lead check/creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
