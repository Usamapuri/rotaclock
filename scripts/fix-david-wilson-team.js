const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function fixDavidWilsonTeam() {
  try {
    console.log('🔧 Fixing David Wilson team assignment...')
    
    // Get David Wilson's current team
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
    console.log(`Current team_id: ${davidWilson.team_id}`)
    
    // Find the team that David Wilson is actually leading
    const leadingTeamResult = await pool.query(`
      SELECT id, name, department, team_lead_id
      FROM teams 
      WHERE team_lead_id = $1 AND is_active = true
    `, [davidWilson.id])
    
    if (leadingTeamResult.rows.length > 0) {
      const leadingTeam = leadingTeamResult.rows[0]
      console.log(`✅ David Wilson is leading team: ${leadingTeam.name} (${leadingTeam.id})`)
      
      // Check if David Wilson's team_id matches the team he's leading
      if (davidWilson.team_id !== leadingTeam.id) {
        console.log('⚠️ Mismatch detected! David Wilson\'s team_id doesn\'t match the team he\'s leading')
        console.log(`Current team_id: ${davidWilson.team_id}`)
        console.log(`Leading team_id: ${leadingTeam.id}`)
        
        // Update David Wilson's team_id to match the team he's leading
        await pool.query(`
          UPDATE employees 
          SET team_id = $1 
          WHERE id = $2
        `, [leadingTeam.id, davidWilson.id])
        
        console.log('✅ Updated David Wilson\'s team_id to match the team he\'s leading')
        
        // Verify the change
        const verifyResult = await pool.query(`
          SELECT id, first_name, last_name, email, team_id
          FROM employees 
          WHERE id = $1
        `, [davidWilson.id])
        
        if (verifyResult.rows.length > 0) {
          const updatedDavid = verifyResult.rows[0]
          console.log(`✅ David Wilson now has team_id: ${updatedDavid.team_id}`)
        }
        
        // Check team members
        const membersResult = await pool.query(`
          SELECT e.first_name, e.last_name, e.email
          FROM employees e
          WHERE e.team_id = $1 AND e.is_active = true
          ORDER BY e.first_name
        `, [leadingTeam.id])
        
        console.log(`📊 Team ${leadingTeam.name} now has ${membersResult.rows.length} members:`)
        membersResult.rows.forEach((member, index) => {
          console.log(`  ${index + 1}. ${member.first_name} ${member.last_name} (${member.email})`)
        })
        
      } else {
        console.log('✅ David Wilson\'s team_id already matches the team he\'s leading')
      }
    } else {
      console.log('❌ David Wilson is not leading any team')
    }
    
    console.log('\n🎉 Team assignment fix completed!')
    
  } catch (error) {
    console.error('❌ Error fixing David Wilson team:', error)
  } finally {
    await pool.end()
  }
}

// Run the fix
fixDavidWilsonTeam()
  .then(() => {
    console.log('\n✅ Team fix script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
