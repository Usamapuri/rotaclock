const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugAdminRole() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging admin user role...');
    
    // Get admin user details
    const result = await client.query(`
      SELECT id, employee_id, first_name, last_name, email, role, position, department
      FROM employees 
      WHERE email = 'admin@rotaclock.com' OR employee_id = 'ADM001'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }
    
    const admin = result.rows[0];
    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Employee ID: ${admin.employee_id}`);
    console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: "${admin.role}"`);
    console.log(`   Position: "${admin.position}"`);
    console.log(`   Department: "${admin.department}"`);
    
    // Test the unified login API logic
    console.log('\n🔍 Testing role normalization logic:');
    const role = admin.role || 'employee';
    console.log(`   Raw role from DB: "${admin.role}"`);
    console.log(`   Normalized role: "${role}"`);
    
    // Test the switch statement logic
    console.log('\n🔍 Testing routing logic:');
    switch (role) {
      case 'admin':
        console.log('   ✅ Would route to: /admin/dashboard');
        break;
      case 'project_manager':
        console.log('   ✅ Would route to: /project-manager/dashboard');
        break;
      case 'team_lead':
        console.log('   ✅ Would route to: /team-lead/dashboard');
        break;
      case 'employee':
        console.log('   ✅ Would route to: /employee/dashboard');
        break;
      default:
        console.log(`   ❌ Would route to: /employee/dashboard (default case)`);
    }
    
    // Check all users with admin role
    console.log('\n🔍 Checking all users with admin role:');
    const adminUsers = await client.query(`
      SELECT employee_id, first_name, last_name, email, role 
      FROM employees 
      WHERE role = 'admin' OR employee_id LIKE 'ADM%'
    `);
    
    adminUsers.rows.forEach(user => {
      console.log(`   ${user.employee_id}: ${user.first_name} ${user.last_name} (${user.email}) - Role: "${user.role}"`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging admin role:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
debugAdminRole().catch(console.error);
