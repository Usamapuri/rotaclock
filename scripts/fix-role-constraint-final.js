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

const fixRoleConstraintFinal = async () => {
  try {
    console.log('🔧 Fixing Role Constraint - Final Version...\n')
    
    // Step 1: Drop the current constraint
    console.log('🗑️ Step 1: Dropping current role constraint...')
    
    try {
      await query(`ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check`)
      console.log('   ✅ Dropped existing role constraint')
    } catch (error) {
      console.log('   ⚠️  Could not drop constraint:', error.message)
    }
    
    // Step 2: Add the correct constraint (without 'employee')
    console.log('\n🔒 Step 2: Adding correct role constraint...')
    
    await query(`
      ALTER TABLE employees 
      ADD CONSTRAINT employees_role_check 
      CHECK (role IN ('admin', 'project_manager', 'team_lead', 'agent', 'sales_agent'))
    `)
    console.log('   ✅ Added correct role constraint')
    console.log('   ✅ Allowed roles: admin, project_manager, team_lead, agent, sales_agent')
    
    // Step 3: Check current role distribution
    console.log('\n📊 Step 3: Current role distribution:')
    
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
    
    // Step 4: Check for any employees with null role and set them to 'agent'
    console.log('\n🔧 Step 4: Checking for employees with null role...')
    
    const nullRoleResult = await query(`
      SELECT 
        employee_id,
        email,
        first_name,
        last_name
      FROM employees 
      WHERE role IS NULL
    `)
    
    if (nullRoleResult.rows.length > 0) {
      console.log(`Found ${nullRoleResult.rows.length} employees with null role, updating to 'agent'...`)
      
      await query(`
        UPDATE employees 
        SET role = 'agent', updated_at = NOW()
        WHERE role IS NULL
      `)
      
      console.log('   ✅ Updated all null roles to "agent"')
    } else {
      console.log('   ✅ No employees found with null role')
    }
    
    console.log('\n🎉 Role constraint fixed successfully!')
    console.log('\n📋 Summary:')
    console.log('- Removed "employee" from allowed roles')
    console.log('- All new employees default to "agent" role')
    console.log('- Constraint now allows: admin, project_manager, team_lead, agent, sales_agent')
    console.log('- All employees are agents by default')
    
  } catch (error) {
    console.error('❌ Error fixing role constraint:', error)
  } finally {
    await pool.end()
  }
}

fixRoleConstraintFinal()
