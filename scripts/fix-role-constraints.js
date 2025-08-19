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

const fixRoleConstraints = async () => {
  try {
    console.log('🔧 Fixing Role Constraints...\n')
    
    // Step 1: Check existing constraints
    console.log('📋 Step 1: Checking existing constraints...')
    
    const constraintsResult = await query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = 'employees'::regclass
      AND conname LIKE '%role%'
    `)
    
    console.log('Current role constraints:')
    constraintsResult.rows.forEach(row => {
      console.log(`   ${row.conname}: ${row.constraint_definition}`)
    })
    
    // Step 2: Drop existing role constraints
    console.log('\n🗑️ Step 2: Dropping existing role constraints...')
    
    for (const row of constraintsResult.rows) {
      try {
        await query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS ${row.conname}`)
        console.log(`   ✅ Dropped constraint: ${row.conname}`)
      } catch (error) {
        console.log(`   ⚠️  Could not drop constraint: ${row.conname}`)
      }
    }
    
    // Step 3: Update employee roles with proper values
    console.log('\n👤 Step 3: Updating employee roles...')
    
    const roleMappings = {
      'ADM': 'admin',
      'PM': 'project_manager', 
      'TL': 'team_lead',
      'AG': 'agent'
    }
    
    for (const [prefix, role] of Object.entries(roleMappings)) {
      const result = await query(`
        UPDATE employees 
        SET role = $1
        WHERE employee_id LIKE $2 || '%'
      `, [role, prefix])
      
      console.log(`   ✅ Updated ${result.rowCount} employees with role: ${role}`)
    }
    
    // Step 4: Add proper role constraint
    console.log('\n🔒 Step 4: Adding proper role constraint...')
    
    await query(`
      ALTER TABLE employees 
      ADD CONSTRAINT employees_role_check 
      CHECK (role IN ('admin', 'project_manager', 'team_lead', 'agent', 'sales_agent'))
    `)
    console.log('   ✅ Added role constraint')
    
    // Step 5: Show final employee roles
    console.log('\n📊 Step 5: Final employee roles:')
    
    const employeesResult = await query(`
      SELECT 
        employee_id,
        email,
        first_name,
        last_name,
        role,
        department,
        position
      FROM employees 
      ORDER BY role, first_name
    `)
    
    const roleGroups = {}
    employeesResult.rows.forEach(emp => {
      if (!roleGroups[emp.role]) {
        roleGroups[emp.role] = []
      }
      roleGroups[emp.role].push(emp)
    })
    
    Object.entries(roleGroups).forEach(([role, employees]) => {
      console.log(`\n${role.toUpperCase()} (${employees.length} employees):`)
      employees.forEach(emp => {
        console.log(`   ${emp.employee_id} - ${emp.first_name} ${emp.last_name} (${emp.email})`)
      })
    })
    
    console.log('\n🎉 Role constraints fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing role constraints:', error)
  } finally {
    await pool.end()
  }
}

fixRoleConstraints()
