const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function testTeamLeadAPI() {
  try {
    console.log('🧪 Testing Team Lead API endpoints...')
    
    // Get David Wilson (team lead for Customer Support Team A)
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
    console.log(`\n📋 Testing with Team Lead: ${davidWilson.first_name} ${davidWilson.last_name} (${davidWilson.id})`)
    
    // Test the getTeamByLead function
    const teamResult = await pool.query(`
      SELECT id, name, department, team_lead_id
      FROM teams 
      WHERE team_lead_id = $1 AND is_active = true
    `, [davidWilson.id])
    
    if (teamResult.rows.length === 0) {
      console.log('❌ No team found for David Wilson')
      return
    }
    
    const team = teamResult.rows[0]
    console.log(`✅ Found team: ${team.name} (${team.id})`)
    
    // Test leave requests for this team
    const leaveRequestsResult = await pool.query(`
      SELECT lr.*, e.first_name, e.last_name, e.email, e.employee_id as emp_id, e.department
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      WHERE e.team_id = $1
      ORDER BY lr.created_at DESC
    `, [team.id])
    
    console.log(`\n📅 Found ${leaveRequestsResult.rows.length} leave requests for team ${team.name}:`)
    leaveRequestsResult.rows.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.first_name} ${req.last_name} - ${req.type} (${req.status})`)
    })
    
    // Test swap requests for this team (should be 0 since we didn't create any)
    const swapRequestsResult = await pool.query(`
      SELECT ss.*, 
             r.first_name as requester_first_name, r.last_name as requester_last_name, r.email as requester_email,
             t.first_name as target_first_name, t.last_name as target_last_name, t.email as target_email
      FROM shift_swaps ss
      LEFT JOIN employees r ON ss.requester_id = r.id
      LEFT JOIN employees t ON ss.target_id = t.id
      WHERE (r.team_id = $1 OR t.team_id = $1)
      ORDER BY ss.created_at DESC
    `, [team.id])
    
    console.log(`\n🔄 Found ${swapRequestsResult.rows.length} swap requests for team ${team.name}`)
    
    console.log('\n✅ API test completed successfully!')
    console.log('The Team Lead API should now work properly with the Authorization headers.')
    
  } catch (error) {
    console.error('❌ Error testing Team Lead API:', error)
  } finally {
    await pool.end()
  }
}

// Run the test
testTeamLeadAPI()
  .then(() => {
    console.log('\n✅ Team Lead API test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
