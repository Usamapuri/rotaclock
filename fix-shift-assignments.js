const { Client } = require('pg')

const client = new Client({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz'
})

async function fixShiftAssignments() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Clear all existing assignments for the current week
    console.log('\nClearing existing assignments for this week...')
    await client.query(`
      DELETE FROM shift_assignments 
      WHERE date >= '2025-08-11' AND date <= '2025-08-17'
    `)

    // Get all employees
    const employeesResult = await client.query(`
      SELECT id, employee_id, first_name, last_name
      FROM employees
      WHERE role = 'employee' AND is_active = true
      ORDER BY employee_id
    `)

    // Get all shifts
    const shiftsResult = await client.query(`
      SELECT id, name, start_time, end_time
      FROM shifts
      WHERE is_active = true
      ORDER BY name
    `)

    console.log(`Found ${employeesResult.rows.length} employees and ${shiftsResult.rows.length} shifts`)

    // Define the current week (Aug 11-17, 2025)
    const weekDates = [
      '2025-08-11', // Monday
      '2025-08-12', // Tuesday
      '2025-08-13', // Wednesday
      '2025-08-14', // Thursday
      '2025-08-15', // Friday
      '2025-08-16', // Saturday
      '2025-08-17'  // Sunday
    ]

    // Assign shifts properly - max 1 shift per day per employee
    let totalAssignments = 0
    
    for (const date of weekDates) {
      console.log(`\nAssigning shifts for ${date}...`)
      
      // Create a copy of employees and shuffle them
      const availableEmployees = [...employeesResult.rows].sort(() => Math.random() - 0.5)
      const availableShifts = [...shiftsResult.rows].sort(() => Math.random() - 0.5)
      
      // Assign one shift per employee for this day
      for (let i = 0; i < Math.min(availableEmployees.length, availableShifts.length); i++) {
        const employee = availableEmployees[i]
        const shift = availableShifts[i]
        
        try {
          await client.query(`
            INSERT INTO shift_assignments (
              employee_id, shift_id, date, status, created_at, updated_at
            ) VALUES ($1, $2, $3, 'assigned', NOW(), NOW())
          `, [employee.id, shift.id, date])
          
          console.log(`  ✅ ${employee.employee_id} (${employee.first_name} ${employee.last_name}) - ${shift.name}`)
          totalAssignments++
        } catch (error) {
          console.error(`  ❌ Failed to assign ${shift.name} to ${employee.employee_id}:`, error.message)
        }
      }
    }

    console.log(`\n🎉 Successfully assigned ${totalAssignments} shifts for the current week!`)

    // Verify assignments
    console.log('\n=== Verification ===')
    const verificationResult = await client.query(`
      SELECT 
        sa.date,
        e.employee_id,
        e.first_name,
        e.last_name,
        s.name as shift_name,
        sa.status
      FROM shift_assignments sa
      JOIN employees e ON sa.employee_id = e.id
      JOIN shifts s ON sa.shift_id = s.id
      WHERE sa.date >= '2025-08-11' AND sa.date <= '2025-08-17'
      ORDER BY sa.date, e.employee_id
    `)

    console.log(`Total assignments for this week: ${verificationResult.rows.length}`)
    
    // Group by date
    const assignmentsByDate = {}
    verificationResult.rows.forEach(row => {
      if (!assignmentsByDate[row.date]) {
        assignmentsByDate[row.date] = []
      }
      assignmentsByDate[row.date].push(row)
    })

    Object.entries(assignmentsByDate).forEach(([date, assignments]) => {
      console.log(`\n${date}:`)
      assignments.forEach(assignment => {
        console.log(`  ${assignment.employee_id} - ${assignment.shift_name}`)
      })
    })

    // Check for duplicates
    console.log('\n=== Checking for Duplicates ===')
    const duplicateCheck = await client.query(`
      SELECT 
        sa.employee_id,
        sa.date,
        COUNT(*) as assignment_count
      FROM shift_assignments sa
      WHERE sa.date >= '2025-08-11' AND sa.date <= '2025-08-17'
      GROUP BY sa.employee_id, sa.date
      HAVING COUNT(*) > 1
    `)

    if (duplicateCheck.rows.length === 0) {
      console.log('✅ No duplicate assignments found - max 1 shift per day per employee')
    } else {
      console.log('❌ Found duplicate assignments:')
      duplicateCheck.rows.forEach(row => {
        console.log(`  Employee ${row.employee_id} has ${row.assignment_count} assignments on ${row.date}`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

fixShiftAssignments()
