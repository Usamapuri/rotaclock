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

const fixRoleConstraintIssue = async () => {
  try {
    console.log('🔧 Fixing Role Constraint Issue...\n')
    
    // Step 1: Check current constraint
    console.log('📋 Step 1: Checking current role constraint...')
    
    const constraintResult = await query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'employees'::regclass
      AND conname = 'employees_role_check'
    `)
    
    if (constraintResult.rows.length > 0) {
      console.log('Current constraint:', constraintResult.rows[0].constraint_definition)
    } else {
      console.log('No role constraint found')
    }
    
    // Step 2: Drop the current constraint
    console.log('\n🗑️ Step 2: Dropping current role constraint...')
    
    try {
      await query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check`)
      console.log('   ✅ Dropped existing role constraint')
    } catch (error) {
      console.log('   ⚠️  Could not drop constraint:', error.message)
    }
    
    // Step 3: Add the updated constraint with 'employee' included
    console.log('\n🔒 Step 3: Adding updated role constraint...')
    
    await query(`
      ALTER TABLE employees 
      ADD CONSTRAINT employees_role_check 
      CHECK (role IN ('admin', 'project_manager', 'team_lead', 'agent', 'sales_agent', 'employee'))
    `)
    console.log('   ✅ Added updated role constraint with "employee" included')
    
    // Step 4: Check for any existing employees with 'employee' role
    console.log('\n👥 Step 4: Checking employees with "employee" role...')
    
    const employeeRoleResult = await query(`
      SELECT 
        employee_id,
        email,
        first_name,
        last_name,
        role
      FROM employees 
      WHERE role = 'employee'
    `)
    
    if (employeeRoleResult.rows.length > 0) {
      console.log(`Found ${employeeRoleResult.rows.length} employees with "employee" role:`)
      employeeRoleResult.rows.forEach(emp => {
        console.log(`   ${emp.employee_id} - ${emp.first_name} ${emp.last_name} (${emp.email})`)
      })
    } else {
      console.log('No employees found with "employee" role')
    }
    
    // Step 5: Show all current role distributions
    console.log('\n📊 Step 5: Current role distribution:')
    
    const roleDistributionResult = await query(`
      SELECT 
        role,
        COUNT(*) as count
      FROM employees 
      GROUP BY role
      ORDER BY count DESC
    `)
    
    roleDistributionResult.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} employees`)
    })
    
    console.log('\n🎉 Role constraint issue fixed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Added "employee" to the allowed role values')
    console.log('- Constraint now allows: admin, project_manager, team_lead, agent, sales_agent, employee')
    console.log('- New employee registrations should work without constraint violations')
    
  } catch (error) {
    console.error('❌ Error fixing role constraint issue:', error)
  } finally {
    await pool.end()
  }
}

fixRoleConstraintIssue()
