const fetch = require('node-fetch')

// Test configuration
const BASE_URL = 'http://localhost:3000'
const TEAM_LEAD_ID = '555e2e86-36c9-4a86-a11d-83bc2af20b04' // Team Lead user ID
const PM_ID = '12f6bf80-f090-459a-93c3-c9fe71b54a82' // Project Manager user ID

async function testTeamLeadRealtime() {
  console.log('🧪 Testing Team Lead Real-time Updates...')
  
  try {
    // First, get the team ID for the team lead
    const teamResponse = await fetch(`${BASE_URL}/api/teams/by-lead?leadId=${TEAM_LEAD_ID}`, {
      headers: {
        'Authorization': `Bearer ${TEAM_LEAD_ID}`
      }
    })
    
    if (!teamResponse.ok) {
      console.log('❌ Failed to get team ID for team lead')
      return
    }
    
    const teamData = await teamResponse.json()
    const teamId = teamData.data?.[0]?.id
    
    if (!teamId) {
      console.log('❌ No team found for team lead')
      return
    }
    
    console.log(`✅ Found team ID: ${teamId}`)
    
    // Test the real-time endpoint
    const realtimeResponse = await fetch(`${BASE_URL}/api/team-lead/realtime?teamId=${teamId}`, {
      headers: {
        'Authorization': `Bearer ${TEAM_LEAD_ID}`
      }
    })
    
    if (!realtimeResponse.ok) {
      console.log(`❌ Team Lead realtime failed: ${realtimeResponse.status}`)
      const errorText = await realtimeResponse.text()
      console.log(`Error: ${errorText}`)
      return
    }
    
    console.log('✅ Team Lead realtime endpoint is accessible')
    
    // Test SSE connection (simplified)
    console.log('📡 Testing SSE connection...')
    const sseResponse = await fetch(`${BASE_URL}/api/team-lead/realtime?teamId=${teamId}`, {
      headers: {
        'Authorization': `Bearer ${TEAM_LEAD_ID}`,
        'Accept': 'text/event-stream'
      }
    })
    
    if (sseResponse.ok) {
      console.log('✅ Team Lead SSE connection established')
    } else {
      console.log(`❌ Team Lead SSE connection failed: ${sseResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ Team Lead realtime test error:', error.message)
  }
}

async function testPMRealtime() {
  console.log('\n🧪 Testing Project Manager Real-time Updates...')
  
  try {
    // Test the real-time endpoint
    const realtimeResponse = await fetch(`${BASE_URL}/api/project-manager/realtime`, {
      headers: {
        'Authorization': `Bearer ${PM_ID}`
      }
    })
    
    if (!realtimeResponse.ok) {
      console.log(`❌ PM realtime failed: ${realtimeResponse.status}`)
      const errorText = await realtimeResponse.text()
      console.log(`Error: ${errorText}`)
      return
    }
    
    console.log('✅ PM realtime endpoint is accessible')
    
    // Test SSE connection (simplified)
    console.log('📡 Testing SSE connection...')
    const sseResponse = await fetch(`${BASE_URL}/api/project-manager/realtime`, {
      headers: {
        'Authorization': `Bearer ${PM_ID}`,
        'Accept': 'text/event-stream'
      }
    })
    
    if (sseResponse.ok) {
      console.log('✅ PM SSE connection established')
    } else {
      console.log(`❌ PM SSE connection failed: ${sseResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ PM realtime test error:', error.message)
  }
}

async function testNotificationsRealtime() {
  console.log('\n🧪 Testing Notifications Real-time Updates...')
  
  try {
    // Test with team lead user
    const realtimeResponse = await fetch(`${BASE_URL}/api/notifications/realtime`, {
      headers: {
        'Authorization': `Bearer ${TEAM_LEAD_ID}`
      }
    })
    
    if (!realtimeResponse.ok) {
      console.log(`❌ Notifications realtime failed: ${realtimeResponse.status}`)
      const errorText = await realtimeResponse.text()
      console.log(`Error: ${errorText}`)
      return
    }
    
    console.log('✅ Notifications realtime endpoint is accessible')
    
    // Test SSE connection (simplified)
    console.log('📡 Testing SSE connection...')
    const sseResponse = await fetch(`${BASE_URL}/api/notifications/realtime`, {
      headers: {
        'Authorization': `Bearer ${TEAM_LEAD_ID}`,
        'Accept': 'text/event-stream'
      }
    })
    
    if (sseResponse.ok) {
      console.log('✅ Notifications SSE connection established')
    } else {
      console.log(`❌ Notifications SSE connection failed: ${sseResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ Notifications realtime test error:', error.message)
  }
}

async function testExistingEndpoints() {
  console.log('\n🧪 Testing Existing SSE Endpoints...')
  
  try {
    // Test dashboard events
    const dashboardResponse = await fetch(`${BASE_URL}/api/dashboard/events?adminId=${TEAM_LEAD_ID}`)
    if (dashboardResponse.ok) {
      console.log('✅ Dashboard events endpoint accessible')
    } else {
      console.log(`❌ Dashboard events failed: ${dashboardResponse.status}`)
    }
    
    // Test team events
    const teamResponse = await fetch(`${BASE_URL}/api/team-lead/events?teamId=test-team-id`)
    if (teamResponse.ok) {
      console.log('✅ Team events endpoint accessible')
    } else {
      console.log(`❌ Team events failed: ${teamResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ Existing endpoints test error:', error.message)
  }
}

async function runAllTests() {
  console.log('🚀 Starting Real-time Updates Tests...\n')
  
  await testTeamLeadRealtime()
  await testPMRealtime()
  await testNotificationsRealtime()
  await testExistingEndpoints()
  
  console.log('\n✅ All real-time update tests completed!')
}

// Run tests
runAllTests().catch(console.error)
