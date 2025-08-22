


-- =====================================================
-- OPTIMIZED DATABASE SCHEMA
-- =====================================================
-- This schema eliminates duplicate tables and confusing IDs
-- Provides better performance and maintainability

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES (Simplified & Optimized)
-- =====================================================

-- 1. TEAMS (New - for better organization)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    lead_id UUID, -- Will reference employees(id) after table creation
    manager_id UUID, -- Will reference employees(id) after table creation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. EMPLOYEES (Simplified - single identifier)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(20) UNIQUE NOT NULL, -- Business identifier (e.g., "EMP001")
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    job_position VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- admin, manager, lead, employee
    hire_date DATE NOT NULL,
    manager_id UUID REFERENCES employees(id),
    team_id UUID REFERENCES teams(id),
    hourly_rate DECIMAL(8,2),
    max_hours_per_week INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    is_online BOOLEAN DEFAULT false,
    last_online TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to teams table (after employees table is created)

-- 3. SHIFT_TEMPLATES (Renamed from shifts for clarity)
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
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SHIFT_ASSIGNMENTS (Optimized - one assignment per employee per day)
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled')),
    assigned_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date) -- One assignment per employee per day
);

-- 5. TIME_ENTRIES (Unified time tracking - replaces time_entries, shift_logs, break_logs)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
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
);

-- 6. LEAVE_REQUESTS (Simplified)
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. NOTIFICATIONS (Unified)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Employee indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_online ON employees(is_online);

-- Team indexes
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

-- Shift template indexes
CREATE INDEX IF NOT EXISTS idx_shift_templates_department ON shift_templates(department);
CREATE INDEX IF NOT EXISTS idx_shift_templates_active ON shift_templates(is_active);

-- Shift assignment indexes
CREATE INDEX IF NOT EXISTS idx_shift_assignments_date ON shift_assignments(date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_date ON shift_assignments(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_template ON shift_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_status ON shift_assignments(status);

-- Time entry indexes
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_assignment ON time_entries(assignment_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);

-- Leave request indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range ON leave_requests(start_date, end_date);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_employee_read ON notifications(employee_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Employee summary view
CREATE OR REPLACE VIEW employee_summary AS
SELECT 
    e.id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.email,
    e.department,
    e.job_position,
    e.role,
    e.is_active,
    e.is_online,
    e.last_online,
    t.name as team_name,
    t.id as team_id,
    m.first_name || ' ' || m.last_name as manager_name,
    COUNT(sa.id) as total_assignments,
    COUNT(te.id) as total_time_entries,
    COALESCE(SUM(te.total_hours), 0) as total_hours_worked
FROM employees e
LEFT JOIN teams t ON e.team_id = t.id
LEFT JOIN employees m ON e.manager_id = m.id
LEFT JOIN shift_assignments sa ON e.id = sa.employee_id
LEFT JOIN time_entries te ON e.id = te.employee_id
GROUP BY e.id, e.employee_code, e.first_name, e.last_name, e.email, e.department, e.job_position, e.role, e.is_active, e.is_online, e.last_online, t.name, t.id, m.first_name, m.last_name;

-- Week schedule view
CREATE OR REPLACE VIEW week_schedule AS
SELECT 
    e.id as employee_id,
    e.employee_code,
    e.first_name,
    e.last_name,
    e.department,
    sa.id as assignment_id,
    sa.date,
    sa.status as assignment_status,
    st.id as template_id,
    st.name as template_name,
    st.start_time,
    st.end_time,
    st.color,
    sa.notes
FROM employees e
LEFT JOIN shift_assignments sa ON e.id = sa.employee_id
LEFT JOIN shift_templates st ON sa.template_id = st.id
WHERE e.is_active = true;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to get employee by code
CREATE OR REPLACE FUNCTION get_employee_by_code(emp_code VARCHAR)
RETURNS TABLE (
    id UUID,
    employee_code VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    department VARCHAR,
    job_position VARCHAR,
    role VARCHAR,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.job_position,
        e.role,
        e.is_active
    FROM employees e
    WHERE e.employee_code = emp_code;
END;
$$ LANGUAGE plpgsql;

-- Function to get week schedule
CREATE OR REPLACE FUNCTION get_week_schedule(start_date DATE, end_date DATE)
RETURNS TABLE (
    employee_id UUID,
    employee_code VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    department VARCHAR,
    assignment_id UUID,
    date DATE,
    assignment_status VARCHAR,
    template_name VARCHAR,
    start_time TIME,
    end_time TIME,
    color VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.department,
        sa.id as assignment_id,
        sa.date,
        sa.status as assignment_status,
        st.name as template_name,
        st.start_time,
        st.end_time,
        st.color
    FROM employees e
    LEFT JOIN shift_assignments sa ON e.id = sa.employee_id 
        AND sa.date BETWEEN start_date AND end_date
    LEFT JOIN shift_templates st ON sa.template_id = st.id
    WHERE e.is_active = true
    ORDER BY e.first_name, sa.date;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR DATA INTEGRITY
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON shift_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraints to teams table (after all tables are created)
ALTER TABLE teams 
ADD CONSTRAINT fk_teams_lead_id FOREIGN KEY (lead_id) REFERENCES employees(id),
ADD CONSTRAINT fk_teams_manager_id FOREIGN KEY (manager_id) REFERENCES employees(id);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample teams
INSERT INTO teams (name, department) VALUES 
('Alpha Team', 'Customer Support'),
('Beta Team', 'Sales'),
('Gamma Team', 'Technical Support')
ON CONFLICT DO NOTHING;

-- Insert sample shift templates
INSERT INTO shift_templates (name, description, start_time, end_time, department, color) VALUES 
('Morning Shift', 'Early morning shift', '09:00', '17:00', 'General', '#3B82F6'),
('Afternoon Shift', 'Afternoon shift', '13:00', '21:00', 'General', '#10B981'),
('Night Shift', 'Overnight shift', '21:00', '05:00', 'General', '#6366F1'),
('Part-time Morning', 'Part-time morning', '09:00', '13:00', 'General', '#F59E0B'),
('Part-time Afternoon', 'Part-time afternoon', '14:00', '18:00', 'General', '#EF4444')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

/*
MIGRATION STEPS:

1. Backup existing data
2. Create new optimized tables
3. Migrate data from old tables:
   - employees.employee_id -> employees.employee_code
   - shifts -> shift_templates
   - Remove duplicate time tracking tables
4. Update foreign key relationships
5. Test all functionality
6. Remove old tables

DATA MIGRATION QUERIES:

-- Migrate employees
INSERT INTO employees (employee_code, first_name, last_name, email, department, position, role, hire_date, is_active)
SELECT employee_id, first_name, last_name, email, department, position, role, hire_date, is_active
FROM old_employees;

-- Migrate shifts to templates
INSERT INTO shift_templates (name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active)
SELECT name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active
FROM shifts;

-- Migrate assignments
INSERT INTO shift_assignments (employee_id, template_id, date, start_time, end_time, status, assigned_by, notes)
SELECT sa.employee_id, sa.shift_id, sa.date, sa.start_time, sa.end_time, sa.status, sa.assigned_by, sa.notes
FROM shift_assignments sa;
*/
