// Test the polling API endpoint
async function testPollingAPI() {
  console.log('🧪 Testing polling API...')

  try {
    const response = await fetch('http://localhost:3000/api/dashboard/data')
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Polling API is working')
      console.log('📊 Stats:', data.stats)
      console.log('📊 Data timestamp:', data.data?.timestamp)
      console.log('📊 Employees count:', data.data?.employees?.length || 0)
      console.log('📊 Shifts count:', data.data?.shifts?.length || 0)
      console.log('📊 Swap requests count:', data.data?.swapRequests?.length || 0)
      console.log('📊 Leave requests count:', data.data?.leaveRequests?.length || 0)
    } else {
      console.log('❌ Polling API returned error:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('❌ Error testing polling API:', error.message)
  }
}

testPollingAPI()
