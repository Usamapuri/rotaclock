const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: { rejectUnauthorized: false }
});

async function safeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting safe database migration...');
    
    // Step 1: Check existing tables
    console.log('🔍 Checking existing tables...');
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'shifts', 'shift_assignments', 'time_entries', 'teams')
    `);
    
    console.log('Existing tables:', existingTables.rows.map(row => row.table_name));
    
    // Step 2: Create new optimized tables (without conflicts)
    console.log('📋 Creating optimized tables...');
    
    // Create teams table first
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100) NOT NULL,
        lead_id UUID,
        manager_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create employees table with new structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_code VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL,
        job_position VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'employee',
        hire_date DATE NOT NULL,
        manager_id UUID,
        team_id UUID,
        hourly_rate DECIMAL(8,2),
        max_hours_per_week INTEGER DEFAULT 40,
        is_active BOOLEAN DEFAULT true,
        is_online BOOLEAN DEFAULT false,
        last_online TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create shift_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        department VARCHAR(100),
        required_staff INTEGER DEFAULT 1,
        hourly_rate DECIMAL(8,2),
        color VARCHAR(7) DEFAULT '#3B82F6',
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create new shift_assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shift_assignments_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        template_id UUID NOT NULL,
        date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled')),
        assigned_by UUID,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(employee_id, date)
      )
    `);
    
    // Create new time_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_entries_new (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL,
        assignment_id UUID,
        date DATE NOT NULL,
        clock_in TIMESTAMP WITH TIME ZONE,
        clock_out TIMESTAMP WITH TIME ZONE,
        break_start TIMESTAMP WITH TIME ZONE,
        break_end TIMESTAMP WITH TIME ZONE,
        total_hours DECIMAL(5,2),
        break_hours DECIMAL(3,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'break', 'overtime')),
        location_lat DECIMAL(10,8),
        location_lng DECIMAL(11,8),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    console.log('✅ New tables created successfully');
    
    // Step 3: Migrate data
    console.log('🔄 Migrating data...');
    
    // Migrate employees
    if (existingTables.rows.some(row => row.table_name === 'employees')) {
      console.log('   Migrating employees...');
      await client.query(`
        INSERT INTO employees_new (
          employee_code, first_name, last_name, email, department, job_position, 
          role, hire_date, manager_id, hourly_rate, max_hours_per_week, 
          is_active, is_online, last_online, created_at, updated_at
        )
        SELECT 
          COALESCE(employee_id, 'EMP' || id::text) as employee_code,
          first_name,
          last_name,
          email,
          COALESCE(department, 'General') as department,
          COALESCE(position, 'Employee') as job_position,
          COALESCE(role, 'employee') as role,
          COALESCE(hire_date, CURRENT_DATE) as hire_date,
          manager_id,
          hourly_rate,
          COALESCE(max_hours_per_week, 40) as max_hours_per_week,
          COALESCE(is_active, true) as is_active,
          COALESCE(is_online, false) as is_online,
          last_online,
          created_at,
          updated_at
        FROM employees
        WHERE NOT EXISTS (
          SELECT 1 FROM employees_new WHERE employee_code = COALESCE(employees.employee_id, 'EMP' || employees.id::text)
        )
      `);
    }
    
    // Migrate shifts to shift_templates
    if (existingTables.rows.some(row => row.table_name === 'shifts')) {
      console.log('   Migrating shifts to templates...');
      await client.query(`
        INSERT INTO shift_templates (
          name, description, start_time, end_time, department, 
          required_staff, hourly_rate, color, is_active, created_by, created_at, updated_at
        )
        SELECT 
          name,
          COALESCE(description, '') as description,
          start_time,
          end_time,
          COALESCE(department, 'General') as department,
          COALESCE(required_staff, 1) as required_staff,
          hourly_rate,
          COALESCE(color, '#3B82F6') as color,
          COALESCE(is_active, true) as is_active,
          created_by,
          created_at,
          updated_at
        FROM shifts
        WHERE NOT EXISTS (
          SELECT 1 FROM shift_templates WHERE name = shifts.name
        )
      `);
    }
    
    // Create teams based on departments
    console.log('   Creating teams...');
    await client.query(`
      INSERT INTO teams_new (name, department)
      SELECT DISTINCT 
        department || ' Team' as name,
        department
      FROM employees_new 
      WHERE department IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM teams_new WHERE teams_new.department = employees_new.department
      )
    `);
    
    // Update employee team assignments
    console.log('   Updating team assignments...');
    await client.query(`
      UPDATE employees_new 
      SET team_id = t.id
      FROM teams_new t
      WHERE employees_new.department = t.department
      AND employees_new.team_id IS NULL
    `);
    
    // Migrate shift assignments
    if (existingTables.rows.some(row => row.table_name === 'shift_assignments')) {
      console.log('   Migrating shift assignments...');
      await client.query(`
        INSERT INTO shift_assignments_new (
          employee_id, template_id, date, start_time, end_time, 
          status, assigned_by, notes, created_at, updated_at
        )
        SELECT 
          e.id as employee_id,
          st.id as template_id,
          sa.date,
          sa.start_time,
          sa.end_time,
          COALESCE(sa.status, 'assigned') as status,
          sa.assigned_by,
          sa.notes,
          sa.created_at,
          sa.updated_at
        FROM shift_assignments sa
        JOIN employees_new e ON e.employee_code = (
          SELECT COALESCE(employee_id, 'EMP' || id::text) FROM employees WHERE id = sa.employee_id
        )
        JOIN shift_templates st ON st.name = (
          SELECT name FROM shifts WHERE id = sa.shift_id
        )
        WHERE NOT EXISTS (
          SELECT 1 FROM shift_assignments_new 
          WHERE employee_id = e.id AND date = sa.date
        )
      `);
    }
    
    // Migrate time entries
    if (existingTables.rows.some(row => row.table_name === 'time_entries')) {
      console.log('   Migrating time entries...');
      await client.query(`
        INSERT INTO time_entries_new (
          employee_id, assignment_id, date, clock_in, clock_out,
          break_start, break_end, total_hours, status, location_lat,
          location_lng, notes, created_at, updated_at
        )
        SELECT 
          e.id as employee_id,
          sa.id as assignment_id,
          DATE(te.clock_in) as date,
          te.clock_in,
          te.clock_out,
          te.break_start,
          te.break_end,
          te.total_hours,
          COALESCE(te.status, 'in-progress') as status,
          te.location_lat,
          te.location_lng,
          te.notes,
          te.created_at,
          te.updated_at
        FROM time_entries te
        JOIN employees_new e ON e.employee_code = (
          SELECT COALESCE(employee_id, 'EMP' || id::text) FROM employees WHERE id = te.employee_id
        )
        LEFT JOIN shift_assignments_new sa ON sa.employee_id = e.id AND sa.date = DATE(te.clock_in)
        WHERE NOT EXISTS (
          SELECT 1 FROM time_entries_new 
          WHERE employee_id = e.id AND date = DATE(te.clock_in)
        )
      `);
    }
    
    console.log('✅ Data migration completed');
    
    // Step 4: Add foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    await client.query(`
      ALTER TABLE employees_new 
      ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees_new(id),
      ADD CONSTRAINT fk_employees_team FOREIGN KEY (team_id) REFERENCES teams_new(id)
    `);
    
    await client.query(`
      ALTER TABLE teams_new 
      ADD CONSTRAINT fk_teams_lead FOREIGN KEY (lead_id) REFERENCES employees_new(id),
      ADD CONSTRAINT fk_teams_manager FOREIGN KEY (manager_id) REFERENCES employees_new(id)
    `);
    
    await client.query(`
      ALTER TABLE shift_templates 
      ADD CONSTRAINT fk_templates_created_by FOREIGN KEY (created_by) REFERENCES employees_new(id)
    `);
    
    await client.query(`
      ALTER TABLE shift_assignments_new 
      ADD CONSTRAINT fk_assignments_employee FOREIGN KEY (employee_id) REFERENCES employees_new(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_assignments_template FOREIGN KEY (template_id) REFERENCES shift_templates(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by) REFERENCES employees_new(id)
    `);
    
    await client.query(`
      ALTER TABLE time_entries_new 
      ADD CONSTRAINT fk_time_employee FOREIGN KEY (employee_id) REFERENCES employees_new(id) ON DELETE CASCADE,
      ADD CONSTRAINT fk_time_assignment FOREIGN KEY (assignment_id) REFERENCES shift_assignments_new(id) ON DELETE SET NULL
    `);
    
    console.log('✅ Foreign key constraints added');
    
    // Step 5: Verify migration
    console.log('🔍 Verifying migration...');
    const verificationQueries = [
      'SELECT COUNT(*) as employee_count FROM employees_new',
      'SELECT COUNT(*) as team_count FROM teams_new',
      'SELECT COUNT(*) as template_count FROM shift_templates',
      'SELECT COUNT(*) as assignment_count FROM shift_assignments_new',
      'SELECT COUNT(*) as time_entry_count FROM time_entries_new'
    ];
    
    for (const query of verificationQueries) {
      const result = await client.query(query);
      const tableName = query.match(/FROM (\w+)/)[1];
      console.log(`   ${tableName}: ${result.rows[0][Object.keys(result.rows[0])[0]]} records`);
    }
    
    console.log('🎉 Safe migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Test the new tables');
    console.log('   2. Update API endpoints to use new table names');
    console.log('   3. Drop old tables when ready');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
safeMigration().catch(console.error);
