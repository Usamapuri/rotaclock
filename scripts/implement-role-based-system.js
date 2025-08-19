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

const implementRoleBasedSystem = async () => {
  try {
    console.log('🔄 Implementing Role-Based System...\n')
    
    // Step 1: Add role field to employees table
    console.log('📝 Step 1: Adding role field to employees table...')
    
    try {
      await query(`
        ALTER TABLE employees 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'agent'
      `)
      console.log('   ✅ Added role field to employees table')
    } catch (error) {
      console.log('   ⚠️  Role field already exists')
    }
    
    // Step 2: Create roles table for role management
    console.log('\n🎭 Step 2: Creating roles table...')
    
    await query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSONB DEFAULT '{}',
        dashboard_access JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('   ✅ Created roles table')
    
    // Step 3: Insert default roles
    console.log('\n👥 Step 3: Inserting default roles...')
    
    const defaultRoles = [
      {
        name: 'admin',
        display_name: 'System Administrator',
        description: 'Full system access and management',
        permissions: { all: true },
        dashboard_access: ['admin', 'employee', 'team_lead', 'project_manager']
      },
      {
        name: 'project_manager',
        display_name: 'Project Manager',
        description: 'Manages projects and teams',
        permissions: { projects: true, teams: true, reports: true },
        dashboard_access: ['project_manager', 'employee']
      },
      {
        name: 'team_lead',
        display_name: 'Team Lead',
        description: 'Leads a team of agents',
        permissions: { team_management: true, reports: true },
        dashboard_access: ['team_lead', 'employee']
      },
      {
        name: 'agent',
        display_name: 'Customer Support Agent',
        description: 'Handles customer inquiries and support',
        permissions: { customer_support: true },
        dashboard_access: ['employee']
      },
      {
        name: 'sales_agent',
        display_name: 'Sales Agent',
        description: 'Handles sales and lead generation',
        permissions: { sales: true, leads: true },
        dashboard_access: ['employee']
      }
    ]
    
    for (const role of defaultRoles) {
      await query(`
        INSERT INTO roles (name, display_name, description, permissions, dashboard_access)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions,
          dashboard_access = EXCLUDED.dashboard_access,
          updated_at = NOW()
      `, [role.name, role.display_name, role.description, JSON.stringify(role.permissions), JSON.stringify(role.dashboard_access)])
    }
    console.log('   ✅ Inserted default roles')
    
    // Step 4: Update existing employees with proper roles based on current employee_id
    console.log('\n👤 Step 4: Updating employee roles...')
    
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
    
    // Step 5: Create role assignment history table
    console.log('\n📋 Step 5: Creating role assignment history...')
    
    await query(`
      CREATE TABLE IF NOT EXISTS role_assignments (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        employee_email VARCHAR(255) NOT NULL,
        old_role VARCHAR(50),
        new_role VARCHAR(50) NOT NULL,
        assigned_by VARCHAR(255),
        reason TEXT,
        effective_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
    console.log('   ✅ Created role assignments history table')
    
    // Step 6: Show current employee roles
    console.log('\n📊 Step 6: Current employee roles:')
    
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
    
    // Step 7: Create role management API endpoints info
    console.log('\n🌐 Step 7: Required API Endpoints:')
    console.log(`
GET /api/admin/roles - List all roles
POST /api/admin/roles - Create new role
PUT /api/admin/roles/:id - Update role
DELETE /api/admin/roles/:id - Delete role

GET /api/admin/employees/:email/role - Get employee role
PUT /api/admin/employees/:email/role - Update employee role
GET /api/admin/employees/:email/role-history - Get role assignment history

POST /api/admin/employees/:email/assign-role - Assign new role to employee
    `)
    
    console.log('\n🎉 Role-based system implementation completed!')
    console.log('\n📋 Next Steps:')
    console.log('1. Create role management UI in admin panel')
    console.log('2. Update employee profile page with role assignment')
    console.log('3. Implement role-based dashboard access')
    console.log('4. Update all APIs to use role-based permissions')
    console.log('5. Remove employee_id role encoding from frontend')
    
  } catch (error) {
    console.error('❌ Error implementing role-based system:', error)
  } finally {
    await pool.end()
  }
}

implementRoleBasedSystem()
