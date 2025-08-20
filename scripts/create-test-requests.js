const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTestRequests() {
  try {
    console.log('🔧 Creating test swap and leave requests...')
    
    // Get some agents for testing
    const agentsResult = await pool.query(`
      SELECT id, first_name, last_name, email, team_id
      FROM employees 
      WHERE is_active = true AND role = 'agent'
      ORDER BY created_at ASC
      LIMIT 10
    `)
    
    if (agentsResult.rows.length < 2) {
      console.log('❌ Need at least 2 agents to create swap requests')
      return
    }
    
    const agents = agentsResult.rows
    console.log(`Found ${agents.length} agents for testing`)
    
    // Create some test swap requests
    for (let i = 0; i < 3; i++) {
      const requester = agents[i % agents.length]
      const target = agents[(i + 1) % agents.length]
      
      if (requester.id !== target.id) {
        const swapRequestResult = await pool.query(`
          INSERT INTO shift_swaps (
            requester_id, target_id, original_shift_id, requested_shift_id,
            reason, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, NOW(), NOW()
          ) RETURNING id
        `, [
          requester.id,
          target.id,
          null, // original_shift_id (would be a real shift assignment ID)
          null, // requested_shift_id (would be a real shift assignment ID)
          `Test swap request ${i + 1} - ${requester.first_name} wants to swap with ${target.first_name}`,
          'pending'
        ])
        
        console.log(`✅ Created swap request ${i + 1}: ${requester.first_name} ↔ ${target.first_name}`)
      }
    }
    
    // Create some test leave requests
    for (let i = 0; i < 2; i++) {
      const agent = agents[i % agents.length]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7 + i) // Start next week
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 2) // 3 days leave
      
      const leaveRequestResult = await pool.query(`
        INSERT INTO leave_requests (
          employee_id, type, start_date, end_date, days_requested,
          reason, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        ) RETURNING id
      `, [
        agent.id,
        ['vacation', 'sick', 'personal'][i % 3],
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        3,
        `Test leave request ${i + 1} - ${agent.first_name} needs time off`,
        'pending'
      ])
      
      console.log(`✅ Created leave request ${i + 1}: ${agent.first_name} - ${['vacation', 'sick', 'personal'][i % 3]}`)
    }
    
    console.log('\n🎉 Test data created successfully!')
    console.log('Now you can test the Team Lead functionality with these requests.')
    
  } catch (error) {
    console.error('❌ Error creating test requests:', error)
  } finally {
    await pool.end()
  }
}

// Run the function
createTestRequests()
  .then(() => {
    console.log('\n✅ Test request creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
