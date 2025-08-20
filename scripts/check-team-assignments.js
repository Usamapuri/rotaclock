const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkTeamAssignments() {
  try {
    console.log('🔍 Checking team assignments...')
    
    // Check David Wilson's team
    const davidWilsonResult = await pool.query(`
      SELECT id, first_name, last_name, email, team_id
      FROM employees 
      WHERE email = 'david.wilson@rotacloud.com' AND role = 'team_lead'
    `)
    
    if (davidWilsonResult.rows.length === 0) {
      console.log('❌ David Wilson not found')
      return
    }
    
    const davidWilson = davidWilsonResult.rows[0]
    console.log(`📋 David Wilson: ${davidWilson.first_name} ${davidWilson.last_name} (${davidWilson.id})`)
    console.log(`Team ID: ${davidWilson.team_id}`)
    
    // Check team assignments table
    const teamAssignmentsResult = await pool.query(`
      SELECT 
        ta.employee_id,
        ta.team_id,
        ta.is_active,
        e.first_name,
        e.last_name,
        e.email,
        e.role
      FROM team_assignments ta
      LEFT JOIN employees e ON ta.employee_id = e.id
      WHERE ta.team_id = $1
      ORDER BY e.first_name
    `, [davidWilson.team_id])
    
    console.log(`\n📊 Team Assignments for team ${davidWilson.team_id}:`)
    if (teamAssignmentsResult.rows.length === 0) {
      console.log('  No team assignments found')
    } else {
      teamAssignmentsResult.rows.forEach((assignment, index) => {
        console.log(`  ${index + 1}. ${assignment.first_name} ${assignment.last_name} (${assignment.email}) - Role: ${assignment.role} - Active: ${assignment.is_active}`)
      })
    }
    
    // Check direct employee team assignments
    const directAssignmentsResult = await pool.query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.email,
        e.role,
        e.team_id,
        e.is_active
      FROM employees e
      WHERE e.team_id = $1 AND e.is_active = true
      ORDER BY e.first_name
    `, [davidWilson.team_id])
    
    console.log(`\n👥 Direct Employee Team Assignments for team ${davidWilson.team_id}:`)
    if (directAssignmentsResult.rows.length === 0) {
      console.log('  No direct team assignments found')
    } else {
      directAssignmentsResult.rows.forEach((employee, index) => {
        console.log(`  ${index + 1}. ${employee.first_name} ${employee.last_name} (${employee.email}) - Role: ${employee.role}`)
      })
    }
    
    // Check what the Team Lead API would return
    console.log(`\n🔍 Testing what the Team Lead API would return:`)
    
    // Simulate the getTeamByLead function
    const teamResult = await pool.query(`
      SELECT t.* 
      FROM teams t 
      WHERE t.team_lead_id = $1 AND t.is_active = true
      ORDER BY t.created_at ASC
      LIMIT 1
    `, [davidWilson.id])
    
    if (teamResult.rows.length > 0) {
      const team = teamResult.rows[0]
      console.log(`✅ Found team: ${team.name} (${team.id})`)
      
      // Simulate the team members query
      const membersResult = await pool.query(`
        SELECT e.id, e.first_name, e.last_name, e.email, e.employee_id, e.is_active
        FROM employees e
        WHERE e.team_id = $1 AND e.is_active = true
        ORDER BY e.first_name, e.last_name
      `, [team.id])
      
      console.log(`📊 Team members (${membersResult.rows.length}):`)
      membersResult.rows.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`)
      })
    } else {
      console.log('❌ No team found for David Wilson')
    }
    
    console.log('\n🎉 Team assignment check completed!')
    
  } catch (error) {
    console.error('❌ Error checking team assignments:', error)
  } finally {
    await pool.end()
  }
}

// Run the check
checkTeamAssignments()
  .then(() => {
    console.log('\n✅ Team assignment check script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
