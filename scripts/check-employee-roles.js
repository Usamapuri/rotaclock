const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkEmployeeRoles() {
  try {
    console.log('🔍 Checking employee roles...')
    
    // Check all roles
    const rolesResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM employees 
      WHERE is_active = true
      GROUP BY role
      ORDER BY count DESC
    `)
    
    console.log('\n📊 Employee roles distribution:')
    rolesResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.role || 'NULL'}: ${row.count} employees`)
    })
    
    // Check employees by role
    const employeesResult = await pool.query(`
      SELECT id, first_name, last_name, email, role, team_id, is_active
      FROM employees 
      WHERE is_active = true
      ORDER BY role, first_name
      LIMIT 20
    `)
    
    console.log('\n👥 Sample employees:')
    employeesResult.rows.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.first_name} ${emp.last_name} (${emp.email}) - Role: ${emp.role || 'NULL'} - Team: ${emp.team_id || 'None'}`)
    })
    
  } catch (error) {
    console.error('❌ Error checking employee roles:', error)
  } finally {
    await pool.end()
  }
}

// Run the check
checkEmployeeRoles()
  .then(() => {
    console.log('\n✅ Employee role check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Check failed:', error)
    process.exit(1)
  })
