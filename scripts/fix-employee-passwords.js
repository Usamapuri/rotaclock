const { Pool } = require('pg')

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
  // Use the same hashing method as the authentication system
  return Buffer.from(password).toString('base64')
}

async function fixEmployeePasswords() {
  try {
    console.log('Fixing employee passwords to match authentication system...')
    
    const password = 'password123'
    const passwordHash = hashPassword(password)
    
    console.log(`Password: ${password}`)
    console.log(`Hash: ${passwordHash}`)
    
    // Update all employees with the correct password hash
    const result = await pool.query(`
      UPDATE employees 
      SET password_hash = $1, updated_at = NOW()
      WHERE is_active = true
      RETURNING id, employee_id, first_name, last_name, email
    `, [passwordHash])
    
    console.log(`Updated ${result.rows.length} employees with correct password hash`)
    
    console.log('\nEmployees you can now login with:')
    result.rows.forEach(emp => {
      console.log(`  - Employee ID: ${emp.employee_id}, Name: ${emp.first_name} ${emp.last_name}`)
    })
    
    console.log('\nLogin credentials:')
    console.log(`Employee ID: (any from above)`)
    console.log(`Password: ${password}`)
    
  } catch (error) {
    console.error('Error fixing passwords:', error)
  } finally {
    await pool.end()
  }
}

fixEmployeePasswords()
