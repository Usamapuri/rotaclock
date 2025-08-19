// Simple test to verify SSE endpoint works
const fetch = require('node-fetch')

async function testSSEEndpoint() {
  console.log('🧪 Testing SSE endpoint...')

  try {
    const response = await fetch('http://localhost:3000/api/dashboard/events?adminId=test-admin')
    
    if (response.ok) {
      console.log('✅ SSE endpoint is responding')
      console.log('📊 Content-Type:', response.headers.get('content-type'))
      console.log('📊 Cache-Control:', response.headers.get('cache-control'))
      console.log('📊 Connection:', response.headers.get('connection'))
    } else {
      console.log('❌ SSE endpoint returned error:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('❌ Error testing SSE endpoint:', error.message)
  }
}

testSSEEndpoint()
