// Check if employees have user_id values
const { query } = require('../lib/database')

async function checkEmployeeUserIds() {
  console.log('🔍 Checking employee user_id values...')

  try {
    const result = await query(`
      SELECT 
        id,
        user_id,
        employee_id,
        first_name,
        last_name,
        is_active
      FROM employees
      ORDER BY first_name, last_name
    `)

    console.log('📊 Employee data:')
    result.rows.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.first_name} ${emp.last_name} (${emp.employee_id})`)
      console.log(`   - Employee ID: ${emp.id}`)
      console.log(`   - User ID: ${emp.user_id || 'NULL'}`)
      console.log(`   - Active: ${emp.is_active}`)
      console.log('')
    })

    const withUserId = result.rows.filter(emp => emp.user_id !== null).length
    const withoutUserId = result.rows.filter(emp => emp.user_id === null).length
    const activeWithUserId = result.rows.filter(emp => emp.user_id !== null && emp.is_active).length

    console.log('📈 Summary:')
    console.log(`- Total employees: ${result.rows.length}`)
    console.log(`- With user_id: ${withUserId}`)
    console.log(`- Without user_id: ${withoutUserId}`)
    console.log(`- Active with user_id: ${activeWithUserId}`)

  } catch (error) {
    console.error('❌ Error checking employee user_ids:', error)
  }
}

checkEmployeeUserIds()
