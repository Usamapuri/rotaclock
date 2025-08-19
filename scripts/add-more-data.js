const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addMoreData() {
  const client = await pool.connect();
  
  try {
    console.log('Adding more comprehensive mock data...');
    
    // Get employee IDs
    const employeesResult = await client.query('SELECT id, employee_id FROM employees');
    const employees = employeesResult.rows;
    
    // Get shift IDs
    const shiftsResult = await client.query('SELECT id, name FROM shifts');
    const shifts = shiftsResult.rows;
    
    console.log(`Found ${employees.length} employees and ${shifts.length} shifts`);
    
    // Add time entries for the last 30 days
    const currentDate = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Add time entries for each employee
      for (const employee of employees) {
        // Skip some days randomly to simulate real attendance patterns
        if (Math.random() > 0.1) { // 90% attendance rate
          const clockInTime = new Date(date);
          clockInTime.setHours(9 + Math.floor(Math.random() * 2)); // 9-11 AM
          clockInTime.setMinutes(Math.floor(Math.random() * 60));
          
          const clockOutTime = new Date(clockInTime);
          clockOutTime.setHours(clockInTime.getHours() + 8 + Math.floor(Math.random() * 2)); // 8-10 hours
          
          const breakStart = new Date(clockInTime);
          breakStart.setHours(clockInTime.getHours() + 4);
          
          const breakEnd = new Date(breakStart);
          breakEnd.setMinutes(breakStart.getMinutes() + 30);
          
          const totalHours = (clockOutTime - clockInTime - (breakEnd - breakStart)) / (1000 * 60 * 60);
          
          await client.query(`
            INSERT INTO time_entries (employee_id, clock_in, clock_out, break_start, break_end, total_hours, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'completed')
          `, [employee.id, clockInTime, clockOutTime, breakStart, breakEnd, totalHours]);
        }
      }
    }
    
    // Add shift assignments
    for (let i = 0; i < 30; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Assign employees to shifts
      for (const employee of employees) {
        const shift = shifts[Math.floor(Math.random() * shifts.length)];
        
        await client.query(`
          INSERT INTO shift_assignments (employee_id, shift_id, date, status)
          VALUES ($1, $2, $3, 'completed')
          ON CONFLICT (employee_id, shift_id, date) DO NOTHING
        `, [employee.id, shift.id, dateStr]);
      }
    }
    
    // Add some incomplete time entries (current day)
    const today = new Date();
    const twoHoursAgo = new Date(today.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(today.getTime() - 1 * 60 * 60 * 1000);
    
    await client.query(`
      INSERT INTO time_entries (employee_id, clock_in, status)
      VALUES ($1, $2, 'in-progress')
    `, [employees[0].id, twoHoursAgo]);
    
    await client.query(`
      INSERT INTO time_entries (employee_id, clock_in, status)
      VALUES ($1, $2, 'in-progress')
    `, [employees[1].id, oneHourAgo]);
    
    console.log('Additional mock data added successfully!');
    
    // Verify the data
    const timeEntryCount = await client.query('SELECT COUNT(*) FROM time_entries');
    const assignmentCount = await client.query('SELECT COUNT(*) FROM shift_assignments');
    
    console.log('\nUpdated Data Summary:');
    console.log(`- Employees: ${employees.length}`);
    console.log(`- Time Entries: ${timeEntryCount.rows[0].count}`);
    console.log(`- Shift Assignments: ${assignmentCount.rows[0].count}`);
    console.log(`- Shifts: ${shifts.length}`);
    
  } catch (error) {
    console.error('Error adding mock data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addMoreData().catch(console.error);
