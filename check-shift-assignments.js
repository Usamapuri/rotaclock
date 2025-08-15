const { Client } = require('pg')

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz'
})

async function checkShiftAssignments() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Check current shift assignments with more details
    console.log('\n=== All Shift Assignments ===')
    const assignmentsResult = await client.query(`
      SELECT 
        sa.id,
        sa.employee_id,
        sa.shift_id,
        sa.date,
        sa.status,
        e.first_name,
        e.last_name,
        e.employee_id as emp_code,
        s.name as shift_name,
        s.start_time,
        s.end_time
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id
      JOIN shifts s ON sa.shift_id = s.id
      ORDER BY sa.date, e.first_name, s.name
    `)

    console.log(`Total assignments: ${assignmentsResult.rows.length}`)
    
    // Show all assignments
    assignmentsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.emp_code} (${row.first_name} ${row.last_name}) - ${row.shift_name} on ${row.date} (${row.status})`)
    })
    
    // Group by employee and date to find duplicates
    const assignmentsByEmployee = {}
    assignmentsResult.rows.forEach(row => {
      const key = `${row.emp_code}_${row.date}`
      if (!assignmentsByEmployee[key]) {
        assignmentsByEmployee[key] = []
      }
      assignmentsByEmployee[key].push(row)
    })

    // Find employees with multiple assignments on the same day
    console.log('\n=== Employees with Multiple Assignments on Same Day ===')
    let hasDuplicates = false
    Object.entries(assignmentsByEmployee).forEach(([key, assignments]) => {
      if (assignments.length > 1) {
        hasDuplicates = true
        const [empCode, date] = key.split('_')
        console.log(`\n${empCode} on ${date}:`)
        assignments.forEach(assignment => {
          console.log(`  - ${assignment.shift_name} (${assignment.status})`)
        })
      }
    })
    
    if (!hasDuplicates) {
      console.log('No duplicate assignments found')
    }

    // Check for invalid dates
    console.log('\n=== Checking for Invalid Dates ===')
    let hasInvalidDates = false
    assignmentsResult.rows.forEach(row => {
      if (!row.date || row.date === 'Invalid Date' || row.date === 'null') {
        hasInvalidDates = true
        console.log(`Invalid date found for ${row.emp_code}: ${row.date}`)
      }
    })
    
    if (!hasInvalidDates) {
      console.log('No invalid dates found')
    }

    // Check assignments for this week (Aug 11-17, 2025)
    console.log('\n=== Assignments for Current Week (Aug 11-17, 2025) ===')
    const weekAssignments = assignmentsResult.rows.filter(row => {
      const date = new Date(row.date)
      return date >= new Date('2025-08-11') && date <= new Date('2025-08-17')
    })
    
    weekAssignments.forEach(row => {
      console.log(`${row.emp_code} - ${row.shift_name} on ${row.date}`)
    })

    // Check shifts table
    console.log('\n=== Available Shifts ===')
    const shiftsResult = await client.query(`
      SELECT id, name, start_time, end_time, is_active
      FROM shifts
      ORDER BY name
    `)
    
    shiftsResult.rows.forEach(shift => {
      console.log(`${shift.name}: ${shift.start_time} - ${shift.end_time} (${shift.is_active ? 'active' : 'inactive'})`)
    })

    // Check employees
    console.log('\n=== Employees ===')
    const employeesResult = await client.query(`
      SELECT id, employee_id, first_name, last_name, role, team_id
      FROM employees
      WHERE role = 'employee'
      ORDER BY employee_id
    `)
    
    employeesResult.rows.forEach(emp => {
      console.log(`${emp.employee_id}: ${emp.first_name} ${emp.last_name} (${emp.role})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

checkShiftAssignments()
