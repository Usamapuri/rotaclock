const { Pool } = require('pg')

// Database configuration
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
})

async function createWeeklyShifts() {
  try {
    console.log('Creating weekly shifts for testing...')
    
    // Get current week dates
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
    
    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      weekDates.push(date.toISOString().split('T')[0])
    }
    
    console.log('Week dates:', weekDates)
    
    // Get existing employees and shifts
    const employeesResult = await pool.query('SELECT id, first_name, last_name FROM employees WHERE is_active = true LIMIT 5')
    const shiftsResult = await pool.query('SELECT id, name, start_time, end_time FROM shifts WHERE is_active = true LIMIT 3')
    
    if (employeesResult.rows.length === 0) {
      console.log('No employees found. Creating sample employees...')
      await createSampleEmployees()
      const newEmployeesResult = await pool.query('SELECT id, first_name, last_name FROM employees WHERE is_active = true LIMIT 5')
      employeesResult.rows = newEmployeesResult.rows
    }
    
    if (shiftsResult.rows.length === 0) {
      console.log('No shifts found. Creating sample shifts...')
      await createSampleShifts()
      const newShiftsResult = await pool.query('SELECT id, name, start_time, end_time FROM shifts WHERE is_active = true LIMIT 3')
      shiftsResult.rows = newShiftsResult.rows
    }
    
    const employees = employeesResult.rows
    const shifts = shiftsResult.rows
    
    console.log(`Found ${employees.length} employees and ${shifts.length} shifts`)
    
    // Create shift assignments for the week
    let assignmentCount = 0
    
    for (let i = 0; i < weekDates.length; i++) {
      const date = weekDates[i]
      const dayOfWeek = new Date(date).getDay()
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek === 0 || dayOfWeek === 6) continue
      
      // Assign shifts to different employees each day
      for (let j = 0; j < Math.min(employees.length, shifts.length); j++) {
        const employee = employees[j]
        const shift = shifts[j]
        
        // Check if assignment already exists
        const existingResult = await pool.query(
          'SELECT id FROM shift_assignments WHERE employee_id = $1 AND date = $2',
          [employee.id, date]
        )
        
        if (existingResult.rows.length === 0) {
          await pool.query(`
            INSERT INTO shift_assignments (employee_id, shift_id, date, start_time, end_time, status)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            employee.id,
            shift.id,
            date,
            shift.start_time,
            shift.end_time,
            'confirmed' // Set as confirmed so they can be swapped
          ])
          
          assignmentCount++
          console.log(`Created assignment: ${employee.first_name} ${employee.last_name} - ${shift.name} on ${date}`)
        } else {
          console.log(`Assignment already exists for ${employee.first_name} ${employee.last_name} on ${date}`)
        }
      }
    }
    
    console.log(`\nCreated ${assignmentCount} new shift assignments for the week`)
    console.log('Weekly shifts created successfully!')
    
  } catch (error) {
    console.error('Error creating weekly shifts:', error)
  } finally {
    await pool.end()
  }
}

async function createSampleEmployees() {
  const sampleEmployees = [
    { first_name: 'John', last_name: 'Doe', email: 'john.doe@company.com', employee_id: 'EMP001' },
    { first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@company.com', employee_id: 'EMP002' },
    { first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@company.com', employee_id: 'EMP003' },
    { first_name: 'Sarah', last_name: 'Wilson', email: 'sarah.wilson@company.com', employee_id: 'EMP004' },
    { first_name: 'David', last_name: 'Brown', email: 'david.brown@company.com', employee_id: 'EMP005' }
  ]
  
  for (const emp of sampleEmployees) {
    await pool.query(`
      INSERT INTO employees (first_name, last_name, email, employee_id, department, position, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [emp.first_name, emp.last_name, emp.email, emp.employee_id, 'Operations', 'Employee', 15.00])
  }
  
  console.log('Created sample employees')
}

async function createSampleShifts() {
  const sampleShifts = [
    { name: 'Morning Shift', start_time: '08:00:00', end_time: '16:00:00', department: 'Operations' },
    { name: 'Afternoon Shift', start_time: '12:00:00', end_time: '20:00:00', department: 'Operations' },
    { name: 'Evening Shift', start_time: '16:00:00', end_time: '00:00:00', department: 'Operations' }
  ]
  
  for (const shift of sampleShifts) {
    await pool.query(`
      INSERT INTO shifts (name, start_time, end_time, department, hourly_rate)
      VALUES ($1, $2, $3, $4, $5)
    `, [shift.name, shift.start_time, shift.end_time, shift.department, 15.00])
  }
  
  console.log('Created sample shifts')
}

createWeeklyShifts()
