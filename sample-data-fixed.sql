-- Insert sample employees (without user_id references)
INSERT INTO employees (id, employee_id, first_name, last_name, email, department, position, hire_date, hourly_rate, max_hours_per_week, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'EMP001', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Representative', '2023-01-15', 18.50, 40, true),
('550e8400-e29b-41d4-a716-446655440002', 'EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Support', 'Customer Support Specialist', '2023-02-01', 16.75, 35, true),
('550e8400-e29b-41d4-a716-446655440003', 'EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Operations', 'Operations Manager', '2022-11-10', 25.00, 40, true),
('550e8400-e29b-41d4-a716-446655440004', 'EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'Marketing', 'Marketing Coordinator', '2023-03-20', 19.25, 40, true),
('550e8400-e29b-41d4-a716-446655440005', 'EMP005', 'David', 'Brown', 'david.brown@company.com', 'Sales', 'Sales Manager', '2022-08-15', 28.50, 40, true);

-- Insert sample shifts (without created_by references)
INSERT INTO shifts (id, name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Morning Shift', 'Early morning operations and customer service', '06:00:00', '14:00:00', 'All', 3, 16.00, '#3B82F6', true),
('660e8400-e29b-41d4-a716-446655440002', 'Day Shift', 'Regular business hours operations', '09:00:00', '17:00:00', 'All', 5, 15.50, '#10B981', true),
('660e8400-e29b-41d4-a716-446655440003', 'Evening Shift', 'Evening operations and extended support', '14:00:00', '22:00:00', 'All', 4, 16.50, '#F59E0B', true);

-- Insert sample shift assignments for today (without assigned_by references)
INSERT INTO shift_assignments (id, employee_id, shift_id, date, start_time, end_time, status) VALUES
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE, '14:00:00', '22:00:00', 'confirmed'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed');

-- Insert sample time entries
INSERT INTO time_entries (id, employee_id, shift_assignment_id, clock_in, clock_out, break_start, break_end, total_hours, status, notes) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + INTERVAL '9 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Started on time'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '14 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Evening shift started'),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '17 hours', CURRENT_DATE + INTERVAL '12 hours', CURRENT_DATE + INTERVAL '13 hours', 7.00, 'completed', 'Completed full shift');

-- Insert sample company holidays
INSERT INTO company_holidays (id, name, date, type, description, is_active) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'New Year''s Day', '2024-01-01', 'holiday', 'New Year''s Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440002', 'Christmas Day', '2024-12-25', 'holiday', 'Christmas Day - Office Closed', true);

-- Insert sample onboarding templates (without created_by references)
INSERT INTO onboarding_templates (id, name, description, department, position, total_estimated_time, is_active) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'Sales Representative Onboarding', 'Complete onboarding for new sales representatives', 'Sales', 'Sales Representative', 480, true),
('dd0e8400-e29b-41d4-a716-446655440002', 'Customer Support Onboarding', 'Onboarding process for customer support specialists', 'Support', 'Customer Support Specialist', 360, true);

-- Insert sample onboarding steps
INSERT INTO onboarding_steps (id, template_id, title, description, category, required, estimated_time, step_order, assigned_to, instructions) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'Company Introduction', 'Learn about company history, mission, and values', 'orientation', true, 60, 1, 'HR Team', 'Complete the company introduction video and quiz'),
('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440001', 'Sales Process Training', 'Learn the sales methodology and CRM system', 'training', true, 120, 2, 'Sales Manager', 'Complete sales process training modules'),
('ee0e8400-e29b-41d4-a716-446655440003', 'dd0e8400-e29b-41d4-a716-446655440002', 'Support Tools Training', 'Learn to use support ticketing system and tools', 'training', true, 90, 1, 'Support Manager', 'Complete support tools training and practice scenarios');

-- Insert sample onboarding processes (without assigned_mentor references)
INSERT INTO onboarding_processes (id, employee_id, employee_name, template_id, template_name, start_date, expected_completion_date, status, progress) VALUES
('hh0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'dd0e8400-e29b-41d4-a716-446655440001', 'Sales Representative Onboarding', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 'in-progress', 40.00),
('hh0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'dd0e8400-e29b-41d4-a716-446655440002', 'Customer Support Onboarding', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 'in-progress', 25.00); 