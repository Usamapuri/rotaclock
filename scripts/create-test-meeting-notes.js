const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createTestMeetingNotes() {
  try {
    console.log('📝 Creating test meeting notes...')
    
    // Get team members for David Wilson's team
    const teamMembersResult = await pool.query(`
      SELECT e.id, e.first_name, e.last_name, e.email
      FROM employees e
      WHERE e.team_id = (
        SELECT t.id FROM teams t 
        WHERE t.team_lead_id = (
          SELECT id FROM employees WHERE email = 'david.wilson@rotacloud.com'
        )
      ) AND e.role = 'agent'
    `)
    
    if (teamMembersResult.rows.length === 0) {
      console.log('❌ No team members found for David Wilson')
      return
    }
    
    console.log(`📋 Found ${teamMembersResult.rows.length} team members`)
    
    // Sample meeting notes for different scenarios
    const meetingNotes = [
      {
        title: "Daily Standup",
        content: "Discussed yesterday's performance metrics. Team achieved 95% customer satisfaction. Need to focus on reducing call handling time. John mentioned technical issues with the CRM system.",
        performance_rating: 4,
        total_calls: 25,
        leads_generated: 3
      },
      {
        title: "Weekly Review",
        content: "Weekly team meeting completed. Emma shared insights about customer feedback patterns. Identified need for additional training on new product features. Overall team morale is high.",
        performance_rating: 5,
        total_calls: 30,
        leads_generated: 5
      },
      {
        title: "Shift Summary",
        content: "Handled 28 calls today. Most customers were satisfied with service. One escalation required manager intervention. Team collaboration was excellent throughout the shift.",
        performance_rating: 4,
        total_calls: 28,
        leads_generated: 4
      },
      {
        title: "End of Day Report",
        content: "Completed all scheduled calls. Customer feedback was positive. No major issues reported. Ready for tomorrow's shift.",
        performance_rating: 3,
        total_calls: 22,
        leads_generated: 2
      },
      {
        title: "Team Meeting Notes",
        content: "Discussed new call handling procedures. Team members shared best practices. Identified areas for improvement in response time. Planning for next week's targets.",
        performance_rating: 4,
        total_calls: 26,
        leads_generated: 3
      }
    ]
    
    // Update existing shift logs with meeting notes
    let updatedCount = 0
    
    for (const member of teamMembersResult.rows) {
      // Get recent shift logs for this employee
      const shiftLogsResult = await pool.query(`
        SELECT id, clock_in_time, clock_out_time
        FROM shift_logs 
        WHERE employee_id = $1 AND status = 'completed'
        ORDER BY clock_in_time DESC
        LIMIT 3
      `, [member.id])
      
      for (let i = 0; i < Math.min(shiftLogsResult.rows.length, 3); i++) {
        const shiftLog = shiftLogsResult.rows[i]
        const note = meetingNotes[i % meetingNotes.length]
        
        // Update the shift log with meeting notes
        await pool.query(`
          UPDATE shift_logs 
          SET 
            shift_remarks = $1,
            performance_rating = $2,
            total_calls_taken = $3,
            leads_generated = $4
          WHERE id = $5
        `, [
          `${note.title}\n\n${note.content}`,
          note.performance_rating,
          note.total_calls,
          note.leads_generated,
          shiftLog.id
        ])
        
        updatedCount++
        console.log(`✅ Updated shift log for ${member.first_name} ${member.last_name} with meeting notes`)
      }
    }
    
    console.log(`\n🎉 Successfully updated ${updatedCount} shift logs with meeting notes`)
    
    // Verify the updates
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_with_notes,
        COUNT(CASE WHEN shift_remarks IS NOT NULL AND shift_remarks != '' THEN 1 END) as with_remarks
      FROM shift_logs sl
      LEFT JOIN employees e ON sl.employee_id = e.id
      WHERE e.team_id = (
        SELECT t.id FROM teams t 
        WHERE t.team_lead_id = (
          SELECT id FROM employees WHERE email = 'david.wilson@rotacloud.com'
        )
      )
    `)
    
    const stats = verifyResult.rows[0]
    console.log(`\n📊 Verification Results:`)
    console.log(`  - Total shift logs: ${stats.total_with_notes}`)
    console.log(`  - With meeting notes: ${stats.with_remarks}`)
    
  } catch (error) {
    console.error('❌ Error creating test meeting notes:', error)
  } finally {
    await pool.end()
  }
}

// Run the script
createTestMeetingNotes()
  .then(() => {
    console.log('\n✅ Test meeting notes creation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
