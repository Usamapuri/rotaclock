const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTestTeamRequests() {
  try {
    console.log('📝 Creating test team requests...')
    
    // Get David Wilson's team and team members
    const teamResult = await pool.query(`
      SELECT t.id as team_id, t.name as team_name, tl.id as team_lead_id
      FROM teams t
      LEFT JOIN employees tl ON t.team_lead_id = tl.id
      WHERE tl.email = 'david.wilson@rotacloud.com'
    `)
    
    if (teamResult.rows.length === 0) {
      console.log('❌ No team found for David Wilson')
      return
    }
    
    const team = teamResult.rows[0]
    console.log(`📋 Found team: ${team.team_name} (${team.team_id})`)
    
    // Get team members
    const membersResult = await pool.query(`
      SELECT id, first_name, last_name, email
      FROM employees 
      WHERE team_id = $1 AND role = 'agent' AND is_active = true
      LIMIT 3
    `, [team.team_id])
    
    if (membersResult.rows.length === 0) {
      console.log('❌ No team members found')
      return
    }
    
    console.log(`📋 Found ${membersResult.rows.length} team members`)
    
    // Sample requests data
    const testRequests = [
      {
        type: 'bonus',
        amount: 150.00,
        reason: 'Exceptional performance during the holiday season. Handled 50+ calls with 98% customer satisfaction rate.',
        effective_date: '2024-12-15',
        additional_notes: 'This bonus recognizes outstanding dedication and customer service excellence.'
      },
      {
        type: 'bonus',
        amount: 75.00,
        reason: 'Successfully resolved 3 escalated customer complaints that resulted in positive feedback and retention.',
        effective_date: '2024-12-20',
        additional_notes: 'Demonstrated excellent problem-solving skills and maintained company reputation.'
      },
      {
        type: 'dock',
        amount: 25.00,
        reason: 'Late arrival to shift on December 10th, 2024. Arrived 30 minutes late without prior notification.',
        effective_date: '2024-12-10',
        additional_notes: 'Employee has been warned about punctuality. This dock serves as a reminder of attendance policy.'
      },
      {
        type: 'bonus',
        amount: 200.00,
        reason: 'Achieved monthly target of 500 calls with highest quality score in the team. Exceeded expectations by 15%.',
        effective_date: '2024-12-31',
        additional_notes: 'Consistently high performance throughout the month. Deserves recognition for dedication.'
      },
      {
        type: 'dock',
        amount: 50.00,
        reason: 'Unauthorized early departure on December 5th, 2024. Left 2 hours early without manager approval.',
        effective_date: '2024-12-05',
        additional_notes: 'This is a serious violation of company policy. Employee has been counseled.'
      }
    ]
    
    let createdCount = 0
    
    for (let i = 0; i < Math.min(membersResult.rows.length, 3); i++) {
      const member = membersResult.rows[i]
      const request = testRequests[i]
      
      // Create the request
      await pool.query(`
        INSERT INTO team_requests (
          id, team_lead_id, team_id, employee_id, type, amount, reason, 
          effective_date, additional_notes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        require('crypto').randomUUID(),
        team.team_lead_id,
        team.team_id,
        member.id,
        request.type,
        request.amount,
        request.reason,
        request.effective_date,
        request.additional_notes,
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      ])
      
      createdCount++
      console.log(`✅ Created ${request.type} request for ${member.first_name} ${member.last_name}: $${request.amount}`)
    }
    
    console.log(`\n🎉 Successfully created ${createdCount} test team requests`)
    
    // Verify the requests
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN type = 'bonus' THEN 1 END) as bonus_requests,
        COUNT(CASE WHEN type = 'dock' THEN 1 END) as dock_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
      FROM team_requests 
      WHERE team_lead_id = $1
    `, [team.team_lead_id])
    
    const stats = verifyResult.rows[0]
    console.log(`\n📊 Verification Results:`)
    console.log(`  - Total requests: ${stats.total_requests}`)
    console.log(`  - Bonus requests: ${stats.bonus_requests}`)
    console.log(`  - Dock requests: ${stats.dock_requests}`)
    console.log(`  - Pending requests: ${stats.pending_requests}`)
    
  } catch (error) {
    console.error('❌ Error creating test team requests:', error)
  } finally {
    await pool.end()
  }
}

// Run the script
createTestTeamRequests()
  .then(() => {
    console.log('\n✅ Test team requests creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
