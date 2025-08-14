// Check employee IDs in the database

async function checkEmployeeIds() {
  try {
    console.log('Checking employee IDs in the database...')
    
    const response = await fetch('http://localhost:3000/api/employees')
    const data = await response.json()
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length} employees:`)
      data.data.forEach(employee => {
        console.log(`  ${employee.employee_id} - ${employee.first_name} ${employee.last_name} (${employee.email})`)
      })
    } else {
      console.log('No employees found or error in response')
    }
    
  } catch (error) {
    console.error('Error checking employee IDs:', error)
  }
}

checkEmployeeIds()
