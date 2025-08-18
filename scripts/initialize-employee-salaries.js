const { Pool } = require('pg')

// Railway database configuration using public URL
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function initializeEmployeeSalaries() {
  try {
    console.log('🔄 Initializing employee salaries...')

    // Get all active employees
    const employeesResult = await pool.query(`
      SELECT id, employee_id, first_name, last_name, hourly_rate
      FROM employees
      WHERE is_active = true
    `)

    const employees = employeesResult.rows
    console.log(`📝 Found ${employees.length} active employees`)

    // Initialize salaries for each employee
    for (const employee of employees) {
      try {
        // Check if salary record already exists
        const existingSalary = await pool.query(`
          SELECT id FROM employee_salaries WHERE employee_id = $1
        `, [employee.id])

        if (existingSalary.rows.length === 0) {
          // Create salary record with default values
          await pool.query(`
            INSERT INTO employee_salaries (
              employee_id,
              base_salary,
              hourly_rate,
              currency,
              effective_date,
              is_active
            ) VALUES ($1, $2, $3, 'PKR', CURRENT_DATE, true)
          `, [
            employee.id,
            20000, // Default base salary PKR 20,000
            employee.hourly_rate || 0
          ])

          console.log(`✅ Created salary record for ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
        } else {
          console.log(`⚠️  Salary record already exists for ${employee.first_name} ${employee.last_name} (${employee.employee_id})`)
        }
      } catch (error) {
        console.error(`❌ Error creating salary for ${employee.employee_id}:`, error.message)
      }
    }

    console.log('✅ Employee salary initialization completed!')

    // Verify the results
    const salaryCount = await pool.query('SELECT COUNT(*) FROM employee_salaries')
    console.log(`📊 Total salary records: ${salaryCount.rows[0].count}`)

  } catch (error) {
    console.error('❌ Error initializing employee salaries:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the initialization
initializeEmployeeSalaries()
