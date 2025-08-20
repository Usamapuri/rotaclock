const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkRequests() {
  try {
    console.log('🔍 Checking swap and leave requests...')
    
    // Check swap requests
    const swapRequestsResult = await pool.query(`
      SELECT 
        ss.id, ss.status, ss.created_at,
        r.first_name as requester_first_name, r.last_name as requester_last_name, r.email as requester_email, r.team_id as requester_team_id,
        t.first_name as target_first_name, t.last_name as target_last_name, t.email as target_email, t.team_id as target_team_id
      FROM shift_swaps ss
      LEFT JOIN employees r ON ss.requester_id = r.id
      LEFT JOIN employees t ON ss.target_id = t.id
      ORDER BY ss.created_at DESC
    `)
    
    console.log(`\n🔄 Found ${swapRequestsResult.rows.length} swap requests:`)
    swapRequestsResult.rows.forEach((swap, index) => {
      console.log(`\n${index + 1}. Swap Request:`)
      console.log(`   ID: ${swap.id}`)
      console.log(`   Status: ${swap.status}`)
      console.log(`   Created: ${swap.created_at}`)
      console.log(`   Requester: ${swap.requester_first_name} ${swap.requester_last_name} (${swap.requester_email})`)
      console.log(`   Requester Team ID: ${swap.requester_team_id || 'None'}`)
      console.log(`   Target: ${swap.target_first_name} ${swap.target_last_name} (${swap.target_email})`)
      console.log(`   Target Team ID: ${swap.target_team_id || 'None'}`)
    })
    
    // Check leave requests
    const leaveRequestsResult = await pool.query(`
      SELECT 
        lr.id, lr.status, lr.type, lr.start_date, lr.end_date, lr.created_at,
        e.first_name, e.last_name, e.email, e.team_id
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.employee_id = e.id
      ORDER BY lr.created_at DESC
    `)
    
    console.log(`\n📅 Found ${leaveRequestsResult.rows.length} leave requests:`)
    leaveRequestsResult.rows.forEach((leave, index) => {
      console.log(`\n${index + 1}. Leave Request:`)
      console.log(`   ID: ${leave.id}`)
      console.log(`   Status: ${leave.status}`)
      console.log(`   Type: ${leave.type}`)
      console.log(`   Dates: ${leave.start_date} to ${leave.end_date}`)
      console.log(`   Created: ${leave.created_at}`)
      console.log(`   Employee: ${leave.first_name} ${leave.last_name} (${leave.email})`)
      console.log(`   Team ID: ${leave.team_id || 'None'}`)
    })
    
    // Check if there are any employees with teams
    const employeesWithTeamsResult = await pool.query(`
      SELECT 
        e.id, e.first_name, e.last_name, e.email, e.team_id,
        t.name as team_name, t.team_lead_id
      FROM employees e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.team_id IS NOT NULL AND e.is_active = true
      ORDER BY t.name, e.first_name
    `)
    
    console.log(`\n👥 Found ${employeesWithTeamsResult.rows.length} employees with teams:`)
    employeesWithTeamsResult.rows.forEach((emp, index) => {
      console.log(`\n${index + 1}. Employee:`)
      console.log(`   Name: ${emp.first_name} ${emp.last_name} (${emp.email})`)
      console.log(`   Team: ${emp.team_name} (${emp.team_id})`)
      console.log(`   Team Lead ID: ${emp.team_lead_id || 'None'}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking requests:', error)
  } finally {
    await pool.end()
  }
}

// Run the check
checkRequests()
  .then(() => {
    console.log('\n✅ Request check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
