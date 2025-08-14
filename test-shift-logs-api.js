const fetch = require('node-fetch');

async function testShiftLogsAPI() {
  try {
    console.log('Testing shift logs API...');
    
    const response = await fetch('http://localhost:3000/api/shift-logs?status=active');
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log(`Found ${data.data.length} active shift logs`);
      data.data.forEach((log, index) => {
        console.log(`\nShift Log ${index + 1}:`);
        console.log(`  Employee: ${log.first_name} ${log.last_name}`);
        console.log(`  Status: ${log.status}`);
        console.log(`  Clock In: ${log.clock_in_time}`);
        console.log(`  Employee ID: ${log.employee_id}`);
        console.log(`  Emp ID: ${log.emp_id}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testShiftLogsAPI();
