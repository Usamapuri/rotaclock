const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkTeamLeadUsers() {
  try {
    console.log('🔍 Checking team lead users...')
    
    // Check for team lead users
    const teamLeadsResult = await pool.query(`
      SELECT id, employee_id, first_name, last_name, email, role, team_id, is_active
      FROM employees 
      WHERE role = 'team_lead' AND is_active = true
      ORDER BY created_at ASC
    `)
    
    console.log(`Found ${teamLeadsResult.rows.length} team lead(s):`)
    teamLeadsResult.rows.forEach((tl, index) => {
      console.log(`\n${index + 1}. Team Lead Details:`)
      console.log(`   ID: ${tl.id}`)
      console.log(`   Employee ID: ${tl.employee_id}`)
      console.log(`   Name: ${tl.first_name} ${tl.last_name}`)
      console.log(`   Email: ${tl.email}`)
      console.log(`   Role: ${tl.role}`)
      console.log(`   Team ID: ${tl.team_id || 'None'}`)
      console.log(`   Active: ${tl.is_active}`)
    })
    
    if (teamLeadsResult.rows.length === 0) {
      console.log('\n❌ No team leads found!')
      return
    }
    
    // Check teams for each team lead
    for (const tl of teamLeadsResult.rows) {
      console.log(`\n📋 Checking team for ${tl.first_name} ${tl.last_name}:`)
      
      if (tl.team_id) {
        const teamResult = await pool.query(`
          SELECT id, name, department, team_lead_id, is_active
          FROM teams 
          WHERE id = $1 AND is_active = true
        `, [tl.team_id])
        
        if (teamResult.rows.length > 0) {
          const team = teamResult.rows[0]
          console.log(`   ✅ Team: ${team.name} (${team.id})`)
          console.log(`   Department: ${team.department}`)
          
          // Check team members
          const membersResult = await pool.query(`
            SELECT e.id, e.first_name, e.last_name, e.email, e.employee_id
            FROM employees e
            JOIN team_assignments ta ON e.id = ta.employee_id
            WHERE ta.team_id = $1 AND ta.is_active = true AND e.is_active = true
          `, [team.id])
          
          console.log(`   📊 Team has ${membersResult.rows.length} members:`)
          membersResult.rows.forEach((member, idx) => {
            console.log(`      ${idx + 1}. ${member.first_name} ${member.last_name} (${member.employee_id})`)
          })
        } else {
          console.log(`   ❌ Team not found for team_id: ${tl.team_id}`)
        }
      } else {
        console.log(`   ⚠️  No team assigned`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking team lead users:', error)
  } finally {
    await pool.end()
  }
}

// Run the check
checkTeamLeadUsers()
  .then(() => {
    console.log('\n✅ Team lead user check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
