-- =====================================================
-- MIGRATION SCRIPT: Current Schema to Optimized Schema
-- =====================================================
-- This script migrates from the current confusing schema to the optimized one
-- Run this after creating the new optimized tables

-- =====================================================
-- STEP 1: BACKUP EXISTING DATA
-- =====================================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS backup_employees AS SELECT * FROM employees;
CREATE TABLE IF NOT EXISTS backup_shifts AS SELECT * FROM shifts;
CREATE TABLE IF NOT EXISTS backup_shift_assignments AS SELECT * FROM shift_assignments;
CREATE TABLE IF NOT EXISTS backup_time_entries AS SELECT * FROM time_entries;

-- =====================================================
-- STEP 2: MIGRATE EMPLOYEES
-- =====================================================

-- Insert employees with simplified structure
INSERT INTO employees (
    employee_code,
    first_name,
    last_name,
    email,
    department,
    position,
    role,
    hire_date,
    manager_id,
    hourly_rate,
    max_hours_per_week,
    is_active,
    is_online,
    last_online,
    created_at,
    updated_at
)
SELECT 
    employee_id as employee_code,
    first_name,
    last_name,
    email,
    COALESCE(department, 'General') as department,
    COALESCE(position, 'Employee') as position,
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
FROM backup_employees
WHERE NOT EXISTS (
    SELECT 1 FROM employees WHERE employee_code = backup_employees.employee_id
);

-- =====================================================
-- STEP 3: MIGRATE SHIFTS TO SHIFT_TEMPLATES
-- =====================================================

-- Insert shift templates
INSERT INTO shift_templates (
    name,
    description,
    start_time,
    end_time,
    department,
    required_staff,
    hourly_rate,
    color,
    is_active,
    created_by,
    created_at,
    updated_at
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
FROM backup_shifts
WHERE NOT EXISTS (
    SELECT 1 FROM shift_templates WHERE name = backup_shifts.name
);

-- =====================================================
-- STEP 4: MIGRATE SHIFT ASSIGNMENTS
-- =====================================================

-- Insert shift assignments with new structure
INSERT INTO shift_assignments (
    employee_id,
    template_id,
    date,
    start_time,
    end_time,
    status,
    assigned_by,
    notes,
    created_at,
    updated_at
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
FROM backup_shift_assignments sa
JOIN employees e ON e.employee_code = (
    SELECT employee_id FROM backup_employees WHERE id = sa.employee_id
)
JOIN shift_templates st ON st.name = (
    SELECT name FROM backup_shifts WHERE id = sa.shift_id
)
WHERE NOT EXISTS (
    SELECT 1 FROM shift_assignments 
    WHERE employee_id = e.id AND date = sa.date
);

-- =====================================================
-- STEP 5: MIGRATE TIME ENTRIES
-- =====================================================

-- Insert time entries with unified structure
INSERT INTO time_entries (
    employee_id,
    assignment_id,
    date,
    clock_in,
    clock_out,
    break_start,
    break_end,
    total_hours,
    status,
    location_lat,
    location_lng,
    notes,
    created_at,
    updated_at
)
SELECT 
    e.id as employee_id,
    sa.id as assignment_id,
    te.date,
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
FROM backup_time_entries te
JOIN employees e ON e.employee_code = (
    SELECT employee_id FROM backup_employees WHERE id = te.employee_id
)
LEFT JOIN shift_assignments sa ON sa.employee_id = e.id AND sa.date = te.date
WHERE NOT EXISTS (
    SELECT 1 FROM time_entries 
    WHERE employee_id = e.id AND date = te.date
);

-- =====================================================
-- STEP 6: CREATE TEAMS (if not exists)
-- =====================================================

-- Create teams based on departments
INSERT INTO teams (name, department)
SELECT DISTINCT 
    department || ' Team' as name,
    department
FROM employees 
WHERE department IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM teams WHERE teams.department = employees.department
);

-- =====================================================
-- STEP 7: UPDATE EMPLOYEE TEAM ASSIGNMENTS
-- =====================================================

-- Assign employees to teams based on department
UPDATE employees 
SET team_id = t.id
FROM teams t
WHERE employees.department = t.department
AND employees.team_id IS NULL;

-- =====================================================
-- STEP 8: VALIDATION QUERIES
-- =====================================================

-- Check migration results
SELECT 'Employees migrated:' as check_type, COUNT(*) as count FROM employees
UNION ALL
SELECT 'Shift templates migrated:', COUNT(*) FROM shift_templates
UNION ALL
SELECT 'Shift assignments migrated:', COUNT(*) FROM shift_assignments
UNION ALL
SELECT 'Time entries migrated:', COUNT(*) FROM time_entries
UNION ALL
SELECT 'Teams created:', COUNT(*) FROM teams;

-- Check for any orphaned records
SELECT 'Orphaned assignments (no employee):', COUNT(*) 
FROM backup_shift_assignments sa
LEFT JOIN employees e ON e.employee_code = (
    SELECT employee_id FROM backup_employees WHERE id = sa.employee_id
)
WHERE e.id IS NULL;

SELECT 'Orphaned assignments (no template):', COUNT(*) 
FROM backup_shift_assignments sa
LEFT JOIN shift_templates st ON st.name = (
    SELECT name FROM backup_shifts WHERE id = sa.shift_id
)
WHERE st.id IS NULL;

-- =====================================================
-- STEP 9: CLEANUP (Optional - run after validation)
-- =====================================================

-- Uncomment these lines after confirming migration was successful
/*
-- Drop backup tables
DROP TABLE IF EXISTS backup_employees;
DROP TABLE IF EXISTS backup_shifts;
DROP TABLE IF EXISTS backup_shift_assignments;
DROP TABLE IF EXISTS backup_time_entries;

-- Drop old tables (if they exist and are no longer needed)
-- DROP TABLE IF EXISTS old_employees;
-- DROP TABLE IF EXISTS old_shifts;
-- DROP TABLE IF EXISTS old_shift_assignments;
-- DROP TABLE IF EXISTS old_time_entries;
*/

-- =====================================================
-- STEP 10: UPDATE API ENDPOINTS
-- =====================================================

/*
After running this migration, update your API endpoints to use the new schema:

1. Update /api/employees to use employee_code instead of employee_id
2. Update /api/shift-templates instead of /api/shifts
3. Update /api/shift-assignments with new structure
4. Update /api/time-entries with unified structure

Example API updates:

-- Old endpoint: /api/employees/[employee_id]
-- New endpoint: /api/employees/[employee_code]

-- Old query: SELECT * FROM employees WHERE employee_id = $1
-- New query: SELECT * FROM employees WHERE employee_code = $1

-- Old assignment: shift_id references shifts table
-- New assignment: template_id references shift_templates table
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Run this query to verify everything is working:
SELECT 
    'Migration Status' as status,
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Data migrated successfully'
        ELSE 'ERROR: No data found in new tables'
    END as message
FROM employees;
