const EventSource = require('eventsource')

async function testSSE() {
  console.log('🧪 Testing Server-Sent Events...')

  const adminId = 'test-admin-123' // Replace with actual admin ID
  const eventSource = new EventSource(`http://localhost:3000/api/dashboard/events?adminId=${adminId}`)

  eventSource.onopen = () => {
    console.log('✅ SSE connection opened')
  }

  eventSource.onmessage = (event) => {
    console.log('📨 Message received:', event.data)
  }

  eventSource.addEventListener('dashboard', (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('📊 Dashboard event:', data)
    } catch (error) {
      console.error('Error parsing dashboard event:', error)
    }
  })

  eventSource.addEventListener('heartbeat', (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('💓 Heartbeat:', data.timestamp)
    } catch (error) {
      console.error('Error parsing heartbeat:', error)
    }
  })

  eventSource.onerror = (error) => {
    console.error('❌ SSE error:', error)
  }

  // Keep connection alive for 30 seconds
  setTimeout(() => {
    console.log('🔄 Closing SSE connection...')
    eventSource.close()
    process.exit(0)
  }, 30000)
}

testSSE().catch(console.error)
