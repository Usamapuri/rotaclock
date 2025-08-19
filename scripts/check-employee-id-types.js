const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

const checkEmployeeIdTypes = async () => {
  try {
    console.log('🔍 Analyzing employee ID types in the database...\n')
    
    // Check employees table
    console.log('📋 EMPLOYEES TABLE:')
    const employeesResult = await query(`
      SELECT 
        id,
        employee_id,
        first_name,
        last_name,
        email,
        department,
        position
      FROM employees 
      ORDER BY employee_id
    `)
    
    console.log(`Total employees: ${employeesResult.rows.length}`)
    console.log('\nEmployee ID patterns:')
    
    const idPatterns = {}
    employeesResult.rows.forEach(emp => {
      const pattern = emp.employee_id.substring(0, 3) // First 3 characters
      if (!idPatterns[pattern]) {
        idPatterns[pattern] = []
      }
      idPatterns[pattern].push({
        id: emp.id,
        employee_id: emp.employee_id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        position: emp.position
      })
    })
    
    Object.keys(idPatterns).forEach(pattern => {
      console.log(`\n${pattern}*** (${idPatterns[pattern].length} employees):`)
      idPatterns[pattern].forEach(emp => {
        console.log(`   ${emp.employee_id} - ${emp.name} (${emp.department}/${emp.position})`)
      })
    })
    
    // Check UUID vs String ID usage
    console.log('\n🔍 ID TYPE ANALYSIS:')
    console.log('UUID (id field):', employeesResult.rows[0]?.id?.length === 36 ? 'Yes' : 'No')
    console.log('String ID (employee_id field):', typeof employeesResult.rows[0]?.employee_id === 'string' ? 'Yes' : 'No')
    
    // Check other tables that reference employees
    console.log('\n📊 EMPLOYEE ID REFERENCES IN OTHER TABLES:')
    
    // Check shift_logs table
    const shiftLogsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as unique_employees
      FROM shift_logs
    `)
    console.log(`shift_logs: ${shiftLogsResult.rows[0].total_records} records, ${shiftLogsResult.rows[0].unique_employees} unique employees`)
    
    // Check payroll_records table
    const payrollRecordsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as unique_employees
      FROM payroll_records
    `)
    console.log(`payroll_records: ${payrollRecordsResult.rows[0].total_records} records, ${payrollRecordsResult.rows[0].unique_employees} unique employees`)
    
    // Check payroll_bonuses table
    const bonusesResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as unique_employees
      FROM payroll_bonuses
    `)
    console.log(`payroll_bonuses: ${bonusesResult.rows[0].total_records} records, ${bonusesResult.rows[0].unique_employees} unique employees`)
    
    // Check payroll_deductions table
    const deductionsResult = await query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT employee_id) as unique_employees
      FROM payroll_deductions
    `)
    console.log(`payroll_deductions: ${deductionsResult.rows[0].total_records} records, ${deductionsResult.rows[0].unique_employees} unique employees`)
    
    // Check which employee IDs are used in shift_logs vs payroll_records
    console.log('\n🔗 CROSS-REFERENCE ANALYSIS:')
    
    const shiftLogsEmployees = await query(`
      SELECT DISTINCT sl.employee_id as shift_log_employee_id, e.employee_id as employee_string_id
      FROM shift_logs sl
      LEFT JOIN employees e ON sl.employee_id = e.id
      LIMIT 5
    `)
    
    console.log('Sample shift_logs employee_id references:')
    shiftLogsEmployees.rows.forEach(row => {
      console.log(`   Shift log UUID: ${row.shift_log_employee_id}`)
      console.log(`   Corresponding string ID: ${row.employee_string_id}`)
    })
    
    const payrollEmployees = await query(`
      SELECT DISTINCT pr.employee_id as payroll_employee_id
      FROM payroll_records pr
      LIMIT 5
    `)
    
    console.log('\nSample payroll_records employee_id references:')
    payrollEmployees.rows.forEach(row => {
      console.log(`   Payroll string ID: ${row.payroll_employee_id}`)
    })
    
    // Summary
    console.log('\n📈 SUMMARY:')
    console.log('1. Employees table has TWO ID fields:')
    console.log('   - id (UUID): Used by shift_logs table')
    console.log('   - employee_id (String): Used by payroll tables')
    console.log('2. Different tables use different ID types:')
    console.log('   - shift_logs: Uses UUID (employees.id)')
    console.log('   - payroll_records: Uses String (employees.employee_id)')
    console.log('   - payroll_bonuses: Uses String (employees.employee_id)')
    console.log('   - payroll_deductions: Uses String (employees.employee_id)')
    
  } catch (error) {
    console.error('❌ Error analyzing employee IDs:', error)
  } finally {
    await pool.end()
  }
}

checkEmployeeIdTypes()
