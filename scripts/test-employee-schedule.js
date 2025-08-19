// Test employee scheduling API

async function testEmployeeSchedule() {
  try {
    console.log('Testing employee scheduling API...')
    
    // Test with different employee IDs and UUIDs
    const testIds = [
      'EMP001', 
      'EMP002', 
      'EMP003', 
      '3cae45f4-f119-41d2-b24f-66a7249cf974', // UUID for Sameer sHAHID
      '90b8785f-242d-4513-928b-40296efee618'  // UUID for Usama Puri
    ]
    
    // Get current week dates
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    
    const weekStart = monday.toISOString().split('T')[0]
    const weekEnd = new Date(monday)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]
    
    console.log(`Testing API for week: ${weekStart} to ${weekEndStr}`)
    
    for (const testId of testIds) {
      console.log(`\n--- Testing with ID: ${testId} ---`)
      
      const url = `http://localhost:3000/api/shifts/assignments?start_date=${weekStart}&end_date=${weekEndStr}&employee_id=${testId}`
      console.log(`Calling: ${url}`)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log(`Response status: ${response.status}`)
      if (data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} assignments for ${testId}`)
        
        if (data.data.length > 0) {
          console.log('Sample assignment:')
          console.log(`  Employee: ${data.data[0].employee_first_name} ${data.data[0].employee_last_name}`)
          console.log(`  Shift: ${data.data[0].shift_name}`)
          console.log(`  Date: ${data.data[0].date}`)
          console.log(`  Status: ${data.data[0].status}`)
        }
      } else {
        console.log('No data or error in response')
      }
    }
    
  } catch (error) {
    console.error('Error testing API:', error)
  }
}

testEmployeeSchedule()
