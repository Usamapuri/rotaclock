const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function setupTestDatabase() {
  console.log('🧪 Setting up test database...')

  try {
    // Create test team lead
    await pool.query(`
      INSERT INTO employees (id, employee_id, first_name, last_name, email, role, is_active, password_hash)
      VALUES (
        'test-tl-id', 
        'TL001', 
        'Test', 
        'Lead', 
        'tl@test.com', 
        'team_lead', 
        true,
        '$2a$10$test.hash.for.testing'
      )
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
    `)

    // Create test team
    await pool.query(`
      INSERT INTO teams (id, name, department, team_lead_id, is_active)
      VALUES (
        'test-team-id', 
        'Test Team', 
        'Test Dept', 
        'test-tl-id', 
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        department = EXCLUDED.department,
        team_lead_id = EXCLUDED.team_lead_id,
        is_active = EXCLUDED.is_active
    `)

    // Create test employees
    await pool.query(`
      INSERT INTO employees (id, employee_id, first_name, last_name, email, role, is_active, password_hash)
      VALUES 
        ('test-employee-1', 'EMP001', 'John', 'Doe', 'john@test.com', 'employee', true, '$2a$10$test.hash.for.testing'),
        ('test-employee-2', 'EMP002', 'Jane', 'Smith', 'jane@test.com', 'employee', true, '$2a$10$test.hash.for.testing'),
        ('test-employee-3', 'EMP003', 'Bob', 'Johnson', 'bob@test.com', 'employee', true, '$2a$10$test.hash.for.testing')
      ON CONFLICT (id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active
    `)

    // Add some employees to the test team
    await pool.query(`
      INSERT INTO team_assignments (team_id, employee_id, assigned_date, is_active)
      VALUES 
        ('test-team-id', 'test-employee-1', CURRENT_DATE, true),
        ('test-team-id', 'test-employee-2', CURRENT_DATE, true)
      ON CONFLICT (team_id, employee_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        assigned_date = EXCLUDED.assigned_date
    `)

    // Update employee team_id for team members
    await pool.query(`
      UPDATE employees 
      SET team_id = 'test-team-id' 
      WHERE id IN ('test-employee-1', 'test-employee-2')
    `)

    console.log('✅ Test database setup completed!')
    console.log('📋 Test data created:')
    console.log('   - Team Lead: TL001 (test-tl-id)')
    console.log('   - Team: Test Team (test-team-id)')
    console.log('   - Employees: EMP001, EMP002, EMP003')
    console.log('   - Team Members: EMP001, EMP002')

  } catch (error) {
    console.error('❌ Error setting up test database:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupTestDatabase }
