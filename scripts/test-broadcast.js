// Test the broadcast message functionality
async function testBroadcast() {
  console.log('🧪 Testing broadcast message...')

  try {
    const response = await fetch('http://localhost:3000/api/notifications/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test broadcast message',
        sendToAll: true
      }),
    })

    console.log('📊 Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Broadcast successful:', data)
    } else {
      const error = await response.json()
      console.log('❌ Broadcast failed:', error)
    }
  } catch (error) {
    console.error('❌ Error testing broadcast:', error.message)
  }
}

testBroadcast()
