const { Pool } = require('pg')

// Database connection configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

const listEmployeesAndRoles = async () => {
  try {
    console.log('🔍 Fetching all employees and their roles...\n')
    
    // Query to get all employees with their role information
    const queryText = `
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.role,
        r.display_name as role_display_name,
        r.description as role_description,
        e.is_active,
        e.hire_date,
        e.hourly_rate,
        e.created_at
      FROM employees e
      LEFT JOIN roles r ON e.role = r.name
      ORDER BY e.first_name, e.last_name
    `
    
    const result = await pool.query(queryText)
    
    if (result.rows.length === 0) {
      console.log('❌ No employees found in the database.')
      return
    }
    
    console.log(`📊 Found ${result.rows.length} employees:\n`)
    
    // Group employees by role
    const roleGroups = {}
    result.rows.forEach(emp => {
      const role = emp.role || 'No Role Assigned'
      if (!roleGroups[role]) {
        roleGroups[role] = []
      }
      roleGroups[role].push(emp)
    })
    
    // Display employees grouped by role
    Object.entries(roleGroups).forEach(([role, employees]) => {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`👥 ${role.toUpperCase()} (${employees.length} employees)`)
      console.log(`${'='.repeat(60)}`)
      
      employees.forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.employee_id} - ${emp.first_name} ${emp.last_name}`)
        console.log(`   📧 Email: ${emp.email}`)
        console.log(`   🏢 Department: ${emp.department || 'Not specified'}`)
        console.log(`   💼 Position: ${emp.position || 'Not specified'}`)
        console.log(`   📅 Hire Date: ${emp.hire_date || 'Not specified'}`)
        console.log(`   💰 Hourly Rate: ${emp.hourly_rate ? `$${emp.hourly_rate}` : 'Not specified'}`)
        console.log(`   ✅ Status: ${emp.is_active ? 'Active' : 'Inactive'}`)
        if (emp.role_display_name) {
          console.log(`   🎭 Role Display: ${emp.role_display_name}`)
        }
        if (emp.role_description) {
          console.log(`   📝 Role Description: ${emp.role_description}`)
        }
        console.log('')
      })
    })
    
    // Summary statistics
    console.log(`\n${'='.repeat(60)}`)
    console.log('📈 SUMMARY STATISTICS')
    console.log(`${'='.repeat(60)}`)
    console.log(`Total Employees: ${result.rows.length}`)
    console.log(`Active Employees: ${result.rows.filter(emp => emp.is_active).length}`)
    console.log(`Inactive Employees: ${result.rows.filter(emp => !emp.is_active).length}`)
    
    Object.entries(roleGroups).forEach(([role, employees]) => {
      const activeCount = employees.filter(emp => emp.is_active).length
      console.log(`${role}: ${employees.length} total (${activeCount} active)`)
    })
    
  } catch (error) {
    console.error('❌ Error fetching employees:', error)
  } finally {
    await pool.end()
  }
}

// Run the script
listEmployeesAndRoles()
