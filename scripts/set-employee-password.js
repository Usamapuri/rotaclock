const { Pool } = require('pg')
const crypto = require('crypto')

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

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function setEmployeePassword() {
  try {
    console.log('Setting password for John Doe...')
    
    // John Doe's employee ID from the database
    const employeeId = 'EMP001'
    const password = 'password123'
    const passwordHash = hashPassword(password)
    
    // Update John Doe's password
    const result = await pool.query(`
      UPDATE employees 
      SET password_hash = $1, updated_at = NOW()
      WHERE employee_id = $2
      RETURNING id, employee_id, first_name, last_name, email
    `, [passwordHash, employeeId])
    
    if (result.rows.length > 0) {
      const employee = result.rows[0]
      console.log(`Password set successfully for ${employee.first_name} ${employee.last_name}`)
      console.log(`Employee ID: ${employee.employee_id}`)
      console.log(`Email: ${employee.email}`)
      console.log(`Password: ${password}`)
      console.log('\nYou can now login with:')
      console.log(`Employee ID: ${employee.employee_id}`)
      console.log(`Password: ${password}`)
    } else {
      console.log('Employee not found')
    }
    
    // Also set password for other employees for testing
    const otherEmployees = [
      { employee_id: 'EMP002', name: 'Jane Smith' },
      { employee_id: 'EMP003', name: 'Mike Johnson' },
      { employee_id: 'EMP004', name: 'Sarah Wilson' },
      { employee_id: 'EMP005', name: 'David Brown' }
    ]
    
    for (const emp of otherEmployees) {
      await pool.query(`
        UPDATE employees 
        SET password_hash = $1, updated_at = NOW()
        WHERE employee_id = $2
      `, [passwordHash, emp.employee_id])
      
      console.log(`Password set for ${emp.name} (${emp.employee_id})`)
    }
    
    console.log('\nAll test employees now have password: password123')
    
  } catch (error) {
    console.error('Error setting password:', error)
  } finally {
    await pool.end()
  }
}

setEmployeePassword()
