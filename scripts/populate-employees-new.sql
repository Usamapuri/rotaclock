-- Populate employees_new table with sample data for testing
-- This script adds sample employees that can be used to test the impersonation feature

BEGIN;

-- Insert sample employees into employees_new table
INSERT INTO employees_new (id, employee_code, first_name, last_name, email, department, job_position, role, hourly_rate, max_hours_per_week, is_active, is_online) VALUES
-- Admin user (for testing impersonation)
('550e8400-e29b-41d4-a716-446655440001', 'ADM001', 'Admin', 'User', 'admin@rotaclock.com', 'IT', 'System Administrator', 'admin', 35.00, 40, true, true),

-- Team Lead users
('550e8400-e29b-41d4-a716-446655440002', 'TL001', 'Sarah', 'Johnson', 'sarah.johnson@rotaclock.com', 'Sales', 'Sales Team Lead', 'team_lead', 28.50, 40, true, true),
('550e8400-e29b-41d4-a716-446655440003', 'TL002', 'Michael', 'Chen', 'michael.chen@rotaclock.com', 'Support', 'Support Team Lead', 'team_lead', 27.00, 40, true, false),

-- Project Manager users
('550e8400-e29b-41d4-a716-446655440004', 'PM001', 'Emily', 'Davis', 'emily.davis@rotaclock.com', 'Marketing', 'Marketing Manager', 'project_manager', 32.00, 40, true, true),
('550e8400-e29b-41d4-a716-446655440005', 'PM002', 'David', 'Wilson', 'david.wilson@rotaclock.com', 'Operations', 'Operations Manager', 'project_manager', 30.00, 40, true, false),

-- Regular employees
('550e8400-e29b-41d4-a716-446655440006', 'EMP001', 'John', 'Doe', 'john.doe@rotaclock.com', 'Sales', 'Sales Representative', 'employee', 18.50, 40, true, true),
('550e8400-e29b-41d4-a716-446655440007', 'EMP002', 'Jane', 'Smith', 'jane.smith@rotaclock.com', 'Support', 'Customer Support Specialist', 'employee', 16.75, 35, true, true),
('550e8400-e29b-41d4-a716-446655440008', 'EMP003', 'Mike', 'Johnson', 'mike.johnson@rotaclock.com', 'Operations', 'Operations Specialist', 'employee', 17.25, 40, true, false),
('550e8400-e29b-41d4-a716-446655440009', 'EMP004', 'Lisa', 'Brown', 'lisa.brown@rotaclock.com', 'Marketing', 'Marketing Coordinator', 'employee', 19.25, 40, true, true),
('550e8400-e29b-41d4-a716-446655440010', 'EMP005', 'Alex', 'Taylor', 'alex.taylor@rotaclock.com', 'Sales', 'Sales Representative', 'employee', 18.00, 40, true, false),
('550e8400-e29b-41d4-a716-446655440011', 'EMP006', 'Emma', 'Wilson', 'emma.wilson@rotaclock.com', 'Support', 'Customer Support Specialist', 'employee', 16.50, 35, true, true),
('550e8400-e29b-41d4-a716-446655440012', 'EMP007', 'James', 'Miller', 'james.miller@rotaclock.com', 'Operations', 'Operations Specialist', 'employee', 17.00, 40, true, false),
('550e8400-e29b-41d4-a716-446655440013', 'EMP008', 'Kashaf', 'Murtaza', 'kashaf.murtaza@rotaclock.com', 'IT', 'Software Developer', 'employee', 22.00, 40, true, true),
('550e8400-e29b-41d4-a716-446655440014', 'EMP009', 'Maria', 'Garcia', 'maria.garcia@rotaclock.com', 'Marketing', 'Marketing Assistant', 'employee', 18.75, 40, true, false),
('550e8400-e29b-41d4-a716-446655440015', 'EMP010', 'Robert', 'Anderson', 'robert.anderson@rotaclock.com', 'Sales', 'Sales Representative', 'employee', 18.25, 40, true, true);

-- Update last_online for online employees
UPDATE employees_new 
SET last_online = NOW() 
WHERE is_online = true;

COMMIT;

-- Display the inserted data
SELECT 
  employee_code,
  first_name,
  last_name,
  email,
  department,
  job_position,
  role,
  is_active,
  is_online
FROM employees_new 
ORDER BY role, first_name, last_name;
