-- Insert sample employees (using auto-generated UUIDs)
INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hire_date, hourly_rate, max_hours_per_week, is_active) VALUES
('EMP001', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Representative', '2023-01-15', 18.50, 40, true),
('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Support', 'Customer Support Specialist', '2023-02-01', 16.75, 35, true),
('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Operations', 'Operations Manager', '2022-11-10', 25.00, 40, true),
('EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'Marketing', 'Marketing Coordinator', '2023-03-20', 19.25, 40, true),
('EMP005', 'David', 'Brown', 'david.brown@company.com', 'Sales', 'Sales Manager', '2022-08-15', 28.50, 40, true);

-- Insert sample shifts (using auto-generated UUIDs)
INSERT INTO shifts (name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active) VALUES
('Morning Shift', 'Early morning operations and customer service', '06:00:00', '14:00:00', 'All', 3, 16.00, '#3B82F6', true),
('Day Shift', 'Regular business hours operations', '09:00:00', '17:00:00', 'All', 5, 15.50, '#10B981', true),
('Evening Shift', 'Evening operations and extended support', '14:00:00', '22:00:00', 'All', 4, 16.50, '#F59E0B', true);

-- Insert sample shift assignments for today
INSERT INTO shift_assignments (employee_id, shift_id, date, start_time, end_time, status) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), (SELECT id FROM shifts WHERE name = 'Day Shift'), CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed'),
((SELECT id FROM employees WHERE employee_id = 'EMP002'), (SELECT id FROM shifts WHERE name = 'Evening Shift'), CURRENT_DATE, '14:00:00', '22:00:00', 'confirmed'),
((SELECT id FROM employees WHERE employee_id = 'EMP003'), (SELECT id FROM shifts WHERE name = 'Day Shift'), CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed');

-- Insert sample time entries
INSERT INTO time_entries (employee_id, shift_assignment_id, clock_in, clock_out, break_start, break_end, total_hours, status, notes) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), (SELECT id FROM shift_assignments WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'EMP001') LIMIT 1), CURRENT_DATE + INTERVAL '9 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Started on time'),
((SELECT id FROM employees WHERE employee_id = 'EMP002'), (SELECT id FROM shift_assignments WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'EMP002') LIMIT 1), CURRENT_DATE + INTERVAL '14 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Evening shift started'),
((SELECT id FROM employees WHERE employee_id = 'EMP003'), (SELECT id FROM shift_assignments WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'EMP003') LIMIT 1), CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '17 hours', CURRENT_DATE + INTERVAL '12 hours', CURRENT_DATE + INTERVAL '13 hours', 7.00, 'completed', 'Completed full shift');

-- Insert sample company holidays
INSERT INTO company_holidays (name, date, type, description, is_active) VALUES
('New Year''s Day', '2024-01-01', 'holiday', 'New Year''s Day - Office Closed', true),
('Christmas Day', '2024-12-25', 'holiday', 'Christmas Day - Office Closed', true);

-- Insert sample onboarding templates
INSERT INTO onboarding_templates (name, description, department, position, total_estimated_time, is_active) VALUES
('Sales Representative Onboarding', 'Complete onboarding for new sales representatives', 'Sales', 'Sales Representative', 480, true),
('Customer Support Onboarding', 'Onboarding process for customer support specialists', 'Support', 'Customer Support Specialist', 360, true);

-- Insert sample onboarding steps
INSERT INTO onboarding_steps (template_id, title, description, category, required, estimated_time, step_order, assigned_to, instructions) VALUES
((SELECT id FROM onboarding_templates WHERE name = 'Sales Representative Onboarding'), 'Company Introduction', 'Learn about company history, mission, and values', 'orientation', true, 60, 1, 'HR Team', 'Complete the company introduction video and quiz'),
((SELECT id FROM onboarding_templates WHERE name = 'Sales Representative Onboarding'), 'Sales Process Training', 'Learn the sales methodology and CRM system', 'training', true, 120, 2, 'Sales Manager', 'Complete sales process training modules'),
((SELECT id FROM onboarding_templates WHERE name = 'Customer Support Onboarding'), 'Support Tools Training', 'Learn to use support ticketing system and tools', 'training', true, 90, 1, 'Support Manager', 'Complete support tools training and practice scenarios');

-- Insert sample onboarding processes
INSERT INTO onboarding_processes (employee_id, employee_name, template_id, template_name, start_date, expected_completion_date, status, progress) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), 'John Doe', (SELECT id FROM onboarding_templates WHERE name = 'Sales Representative Onboarding'), 'Sales Representative Onboarding', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 'in-progress', 40.00),
((SELECT id FROM employees WHERE employee_id = 'EMP002'), 'Jane Smith', (SELECT id FROM onboarding_templates WHERE name = 'Customer Support Onboarding'), 'Customer Support Onboarding', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 'in-progress', 25.00); 