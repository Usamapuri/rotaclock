-- Demo data for RotaCloud SaaS
-- This script creates basic sample data for testing

-- Clear existing data (if any)
TRUNCATE TABLE time_entries CASCADE;
TRUNCATE TABLE shift_assignments CASCADE;
TRUNCATE TABLE shifts CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE company_holidays CASCADE;

-- Insert sample employees
INSERT INTO employees (
    id,
    employee_id,
    first_name,
    last_name,
    email,
    department,
    position,
    hire_date,
    hourly_rate,
    max_hours_per_week,
    is_active,
    created_at,
    updated_at
) VALUES 
    (gen_random_uuid(), 'EMP001', 'John', 'Doe', 'john.doe@company.com', 'Engineering', 'Software Engineer', '2023-01-15', 25.00, 40, true, NOW(), NOW()),
    (gen_random_uuid(), 'EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Marketing', 'Marketing Manager', '2023-02-01', 30.00, 40, true, NOW(), NOW()),
    (gen_random_uuid(), 'EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Sales', 'Sales Representative', '2023-03-10', 22.00, 40, true, NOW(), NOW()),
    (gen_random_uuid(), 'EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'HR', 'HR Specialist', '2023-04-05', 28.00, 40, true, NOW(), NOW()),
    (gen_random_uuid(), 'EMP005', 'David', 'Brown', 'david.brown@company.com', 'Engineering', 'Senior Developer', '2023-01-20', 35.00, 40, true, NOW(), NOW());

-- Insert sample shifts
INSERT INTO shifts (
    id,
    name,
    description,
    start_time,
    end_time,
    department,
    required_staff,
    hourly_rate,
    color,
    is_active,
    created_at,
    updated_at
) VALUES 
    (gen_random_uuid(), 'Morning Shift', 'Standard morning shift from 8 AM to 4 PM', '08:00:00', '16:00:00', 'General', 1, 25.00, '#3B82F6', true, NOW(), NOW()),
    (gen_random_uuid(), 'Afternoon Shift', 'Afternoon shift from 12 PM to 8 PM', '12:00:00', '20:00:00', 'General', 1, 25.00, '#10B981', true, NOW(), NOW()),
    (gen_random_uuid(), 'Night Shift', 'Night shift from 8 PM to 4 AM', '20:00:00', '04:00:00', 'General', 1, 30.00, '#6366F1', true, NOW(), NOW()),
    (gen_random_uuid(), 'Part-time Morning', 'Part-time morning shift', '09:00:00', '13:00:00', 'General', 1, 20.00, '#F59E0B', true, NOW(), NOW()),
    (gen_random_uuid(), 'Part-time Evening', 'Part-time evening shift', '17:00:00', '21:00:00', 'General', 1, 20.00, '#EF4444', true, NOW(), NOW());

-- Insert sample shift assignments for the next week
INSERT INTO shift_assignments (
    id,
    employee_id,
    shift_id,
    date,
    status,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    e.id,
    s.id,
    CURRENT_DATE + (i || ' days')::interval,
    'assigned',
    NOW(),
    NOW()
FROM employees e
CROSS JOIN shifts s
CROSS JOIN generate_series(0, 6) i
WHERE e.is_active = true AND s.is_active = true
LIMIT 50;

-- Insert sample time entries for today
INSERT INTO time_entries (
    id,
    employee_id,
    clock_in,
    clock_out,
    break_start,
    break_end,
    total_hours,
    status,
    created_at,
    updated_at
) 
SELECT 
    gen_random_uuid(),
    e.id,
    CURRENT_DATE + '08:00:00'::time,
    CURRENT_DATE + '16:00:00'::time,
    CURRENT_DATE + '12:00:00'::time,
    CURRENT_DATE + '13:00:00'::time,
    7.0,
    'completed',
    NOW(),
    NOW()
FROM employees e
WHERE e.is_active = true
LIMIT 3;

-- Insert company holidays
INSERT INTO company_holidays (
    id,
    name,
    date,
    is_recurring,
    created_at,
    updated_at
) VALUES 
    (gen_random_uuid(), 'New Year''s Day', '2024-01-01', true, NOW(), NOW()),
    (gen_random_uuid(), 'Independence Day', '2024-07-04', true, NOW(), NOW()),
    (gen_random_uuid(), 'Christmas Day', '2024-12-25', true, NOW(), NOW()),
    (gen_random_uuid(), 'Thanksgiving', '2024-11-28', true, NOW(), NOW()),
    (gen_random_uuid(), 'Memorial Day', '2024-05-27', true, NOW(), NOW());

-- Display summary
SELECT 'Demo data inserted successfully!' as message;
SELECT COUNT(*) as employee_count FROM employees;
SELECT COUNT(*) as shift_count FROM shifts;
SELECT COUNT(*) as assignment_count FROM shift_assignments;
SELECT COUNT(*) as time_entry_count FROM time_entries;
SELECT COUNT(*) as holiday_count FROM company_holidays; 