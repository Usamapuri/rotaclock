-- =====================================================
-- SEED DATA FOR SHIFTTRACKER SAAS APPLICATION
-- =====================================================

-- Insert sample employees
INSERT INTO employees (id, employee_id, first_name, last_name, email, department, position, hire_date, hourly_rate, max_hours_per_week, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'EMP001', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Representative', '2023-01-15', 18.50, 40, true),
('550e8400-e29b-41d4-a716-446655440002', 'EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Support', 'Customer Support Specialist', '2023-02-01', 16.75, 35, true),
('550e8400-e29b-41d4-a716-446655440003', 'EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Operations', 'Operations Manager', '2022-11-10', 25.00, 40, true),
('550e8400-e29b-41d4-a716-446655440004', 'EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'Marketing', 'Marketing Coordinator', '2023-03-20', 19.25, 40, true),
('550e8400-e29b-41d4-a716-446655440005', 'EMP005', 'David', 'Brown', 'david.brown@company.com', 'Sales', 'Sales Manager', '2022-08-15', 28.50, 40, true),
('550e8400-e29b-41d4-a716-446655440006', 'EMP006', 'Lisa', 'Garcia', 'lisa.garcia@company.com', 'Support', 'Support Team Lead', '2022-12-01', 22.00, 40, true),
('550e8400-e29b-41d4-a716-446655440007', 'EMP007', 'Robert', 'Taylor', 'robert.taylor@company.com', 'IT', 'System Administrator', '2023-01-10', 24.75, 40, true),
('550e8400-e29b-41d4-a716-446655440008', 'EMP008', 'Emily', 'Davis', 'emily.davis@company.com', 'HR', 'HR Coordinator', '2023-04-05', 20.50, 40, true),
('550e8400-e29b-41d4-a716-446655440009', 'EMP009', 'James', 'Miller', 'james.miller@company.com', 'Sales', 'Sales Representative', '2023-05-12', 17.25, 40, true),
('550e8400-e29b-41d4-a716-446655440010', 'EMP010', 'Amanda', 'Anderson', 'amanda.anderson@company.com', 'Support', 'Customer Support Specialist', '2023-06-01', 16.50, 35, true);

-- Update manager relationships
UPDATE employees SET manager_id = '550e8400-e29b-41d4-a716-446655440005' WHERE id IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440009');
UPDATE employees SET manager_id = '550e8400-e29b-41d4-a716-446655440006' WHERE id IN ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010');

-- Insert sample shifts
INSERT INTO shifts (id, name, description, start_time, end_time, department, required_staff, hourly_rate, color, is_active, created_by) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Morning Shift', 'Early morning operations and customer service', '06:00:00', '14:00:00', 'All', 3, 16.00, '#3B82F6', true, '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440002', 'Day Shift', 'Regular business hours operations', '09:00:00', '17:00:00', 'All', 5, 15.50, '#10B981', true, '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440003', 'Evening Shift', 'Evening operations and extended support', '14:00:00', '22:00:00', 'All', 4, 16.50, '#F59E0B', true, '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440004', 'Night Shift', 'Overnight operations and maintenance', '22:00:00', '06:00:00', 'Operations', 2, 18.00, '#8B5CF6', true, '550e8400-e29b-41d4-a716-446655440003'),
('660e8400-e29b-41d4-a716-446655440005', 'Weekend Shift', 'Weekend coverage and support', '10:00:00', '18:00:00', 'Support', 2, 17.00, '#EF4444', true, '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample shift assignments for the current week
INSERT INTO shift_assignments (id, employee_id, shift_id, date, start_time, end_time, status, assigned_by) VALUES
-- Monday assignments
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE, '14:00:00', '22:00:00', 'confirmed', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE, '09:00:00', '17:00:00', 'confirmed', '550e8400-e29b-41d4-a716-446655440003'),

-- Tuesday assignments
('770e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '17:00:00', 'assigned', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + INTERVAL '1 day', '14:00:00', '22:00:00', 'assigned', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '17:00:00', 'assigned', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '17:00:00', 'assigned', '550e8400-e29b-41d4-a716-446655440003'),
('770e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '1 day', '09:00:00', '17:00:00', 'assigned', '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample time entries
INSERT INTO time_entries (id, employee_id, shift_assignment_id, clock_in, clock_out, break_start, break_end, total_hours, status, notes) VALUES
-- Today's time entries
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + INTERVAL '9 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Started on time'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', CURRENT_DATE + INTERVAL '14 hours', NULL, NULL, NULL, NULL, 'in-progress', 'Evening shift started'),
('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '17 hours', CURRENT_DATE + INTERVAL '12 hours', CURRENT_DATE + INTERVAL '13 hours', 7.00, 'completed', 'Completed full shift'),

-- Yesterday's completed entries
('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', NULL, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '9 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '17 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '12 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '13 hours', 7.00, 'completed', 'Regular day shift'),
('880e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', NULL, CURRENT_DATE - INTERVAL '1 day' + INTERVAL '14 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '22 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '17 hours', CURRENT_DATE - INTERVAL '1 day' + INTERVAL '18 hours', 7.00, 'completed', 'Evening shift completed');

-- Insert sample shift swap requests
INSERT INTO shift_swaps (id, requester_id, target_id, original_shift_id, requested_shift_id, status, reason, created_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440007', 'pending', 'Personal appointment on Tuesday', CURRENT_DATE - INTERVAL '1 day'),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440010', 'approved', 'Medical appointment', CURRENT_DATE - INTERVAL '2 days');

-- Insert sample leave requests
INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, days_requested, reason, status, created_at) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'vacation', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '11 days', 5, 'Family vacation', 'pending', CURRENT_DATE - INTERVAL '3 days'),
('aa0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'sick', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '1 day', 1, 'Medical appointment', 'approved', CURRENT_DATE - INTERVAL '2 days'),
('aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'personal', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '14 days', 1, 'Personal day', 'pending', CURRENT_DATE - INTERVAL '1 day');

-- Insert sample notifications
INSERT INTO notifications (id, user_id, title, message, type, read, action_url, created_at) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Shift Confirmed', 'Your shift for Monday has been confirmed', 'schedule', false, '/employee/schedule', CURRENT_DATE - INTERVAL '1 hour'),
('bb0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Time Entry Reminder', 'Please clock out for your shift', 'time', false, '/employee/time-tracking', CURRENT_DATE - INTERVAL '30 minutes'),
('bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'Leave Request Approved', 'Your vacation request has been approved', 'leave', true, '/employee/leave', CURRENT_DATE - INTERVAL '2 hours'),
('bb0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Shift Swap Request', 'Jane Smith wants to swap shifts with you', 'swap', false, '/employee/schedule', CURRENT_DATE - INTERVAL '3 hours');

-- Insert sample company holidays
INSERT INTO company_holidays (id, name, date, type, description, is_active) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', 'New Year''s Day', '2024-01-01', 'holiday', 'New Year''s Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440002', 'Martin Luther King Jr. Day', '2024-01-15', 'holiday', 'Martin Luther King Jr. Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440003', 'Memorial Day', '2024-05-27', 'holiday', 'Memorial Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440004', 'Independence Day', '2024-07-04', 'holiday', 'Independence Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440005', 'Labor Day', '2024-09-02', 'holiday', 'Labor Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440006', 'Thanksgiving Day', '2024-11-28', 'holiday', 'Thanksgiving Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440007', 'Christmas Day', '2024-12-25', 'holiday', 'Christmas Day - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440008', 'Company Retreat', '2024-06-15', 'company-event', 'Annual company retreat - Office Closed', true),
('cc0e8400-e29b-41d4-a716-446655440009', 'System Maintenance', '2024-02-10', 'maintenance', 'Scheduled system maintenance - Limited operations', true);

-- Insert sample onboarding templates
INSERT INTO onboarding_templates (id, name, description, department, position, total_estimated_time, is_active, created_by) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'Sales Representative Onboarding', 'Complete onboarding for new sales representatives', 'Sales', 'Sales Representative', 480, true, '550e8400-e29b-41d4-a716-446655440005'),
('dd0e8400-e29b-41d4-a716-446655440002', 'Customer Support Onboarding', 'Onboarding process for customer support specialists', 'Support', 'Customer Support Specialist', 360, true, '550e8400-e29b-41d4-a716-446655440006'),
('dd0e8400-e29b-41d4-a716-446655440003', 'Manager Onboarding', 'Leadership onboarding for managers and team leads', 'All', 'Manager', 600, true, '550e8400-e29b-41d4-a716-446655440003'),
('dd0e8400-e29b-41d4-a716-446655440004', 'IT Specialist Onboarding', 'Technical onboarding for IT and system administrators', 'IT', 'System Administrator', 720, true, '550e8400-e29b-41d4-a716-446655440003');

-- Insert sample onboarding steps
INSERT INTO onboarding_steps (id, template_id, title, description, category, required, estimated_time, step_order, assigned_to, instructions) VALUES
-- Sales Representative steps
('ee0e8400-e29b-41d4-a716-446655440001', 'dd0e8400-e29b-41d4-a716-446655440001', 'Company Introduction', 'Learn about company history, mission, and values', 'orientation', true, 60, 1, 'HR Team', 'Complete the company introduction video and quiz'),
('ee0e8400-e29b-41d4-a716-446655440002', 'dd0e8400-e29b-41d4-a716-446655440001', 'Sales Process Training', 'Learn the sales methodology and CRM system', 'training', true, 120, 2, 'Sales Manager', 'Complete sales process training modules'),
('ee0e8400-e29b-41d4-a716-446655440003', 'dd0e8400-e29b-41d4-a716-446655440001', 'Product Knowledge', 'Deep dive into product features and benefits', 'training', true, 180, 3, 'Product Team', 'Study product documentation and complete assessment'),
('ee0e8400-e29b-41d4-a716-446655440004', 'dd0e8400-e29b-41d4-a716-446655440001', 'CRM Setup', 'Set up your CRM account and learn basic operations', 'setup', true, 60, 4, 'IT Team', 'Follow the CRM setup guide and complete initial configuration'),
('ee0e8400-e29b-41d4-a716-446655440005', 'dd0e8400-e29b-41d4-a716-446655440001', 'Shadow Experienced Rep', 'Shadow an experienced sales representative', 'training', true, 240, 5, 'Sales Manager', 'Spend time shadowing and learning from experienced team members'),

-- Customer Support steps
('ee0e8400-e29b-41d4-a716-446655440006', 'dd0e8400-e29b-41d4-a716-446655440002', 'Support Tools Training', 'Learn to use support ticketing system and tools', 'training', true, 90, 1, 'Support Manager', 'Complete support tools training and practice scenarios'),
('ee0e8400-e29b-41d4-a716-446655440007', 'dd0e8400-e29b-41d4-a716-446655440002', 'Customer Service Best Practices', 'Learn customer service techniques and communication', 'training', true, 120, 2, 'Support Manager', 'Complete customer service training modules'),
('ee0e8400-e29b-41d4-a716-446655440008', 'dd0e8400-e29b-41d4-a716-446655440002', 'Product Troubleshooting', 'Learn common product issues and solutions', 'training', true, 150, 3, 'Product Team', 'Study troubleshooting guides and practice scenarios');

-- Insert sample onboarding documents
INSERT INTO onboarding_documents (id, name, type, file_url, required, uploaded_by) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', 'Employee Handbook', 'handbook', 'https://example.com/handbook.pdf', true, '550e8400-e29b-41d4-a716-446655440008'),
('ff0e8400-e29b-41d4-a716-446655440002', 'Sales Process Guide', 'policy', 'https://example.com/sales-process.pdf', true, '550e8400-e29b-41d4-a716-446655440005'),
('ff0e8400-e29b-41d4-a716-446655440003', 'CRM User Manual', 'training', 'https://example.com/crm-manual.pdf', true, '550e8400-e29b-41d4-a716-446655440007'),
('ff0e8400-e29b-41d4-a716-446655440004', 'Support Ticket Guidelines', 'policy', 'https://example.com/support-guidelines.pdf', true, '550e8400-e29b-41d4-a716-446655440006'),
('ff0e8400-e29b-41d4-a716-446655440005', 'Employment Contract Template', 'contract', 'https://example.com/contract-template.pdf', true, '550e8400-e29b-41d4-a716-446655440008');

-- Link documents to steps
INSERT INTO step_documents (id, step_id, document_id) VALUES
('gg0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', 'ff0e8400-e29b-41d4-a716-446655440001'),
('gg0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440002', 'ff0e8400-e29b-41d4-a716-446655440002'),
('gg0e8400-e29b-41d4-a716-446655440003', 'ee0e8400-e29b-41d4-a716-446655440004', 'ff0e8400-e29b-41d4-a716-446655440003'),
('gg0e8400-e29b-41d4-a716-446655440004', 'ee0e8400-e29b-41d4-a716-446655440006', 'ff0e8400-e29b-41d4-a716-446655440004'),
('gg0e8400-e29b-41d4-a716-446655440005', 'ee0e8400-e29b-41d4-a716-446655440006', 'ff0e8400-e29b-41d4-a716-446655440005');

-- Insert sample onboarding processes
INSERT INTO onboarding_processes (id, employee_id, employee_name, template_id, template_name, start_date, expected_completion_date, status, assigned_mentor, progress) VALUES
('hh0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440009', 'James Miller', 'dd0e8400-e29b-41d4-a716-446655440001', 'Sales Representative Onboarding', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '4 days', 'in-progress', '550e8400-e29b-41d4-a716-446655440005', 40.00),
('hh0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440010', 'Amanda Anderson', 'dd0e8400-e29b-41d4-a716-446655440002', 'Customer Support Onboarding', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE + INTERVAL '6 days', 'in-progress', '550e8400-e29b-41d4-a716-446655440006', 25.00);

-- Insert sample step completions
INSERT INTO step_completions (id, process_id, step_id, completed_at, feedback, completed_by) VALUES
('ii0e8400-e29b-41d4-a716-446655440001', 'hh0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '2 days', 'Great introduction to the company culture', '550e8400-e29b-41d4-a716-446655440009'),
('ii0e8400-e29b-41d4-a716-446655440002', 'hh0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440002', CURRENT_DATE - INTERVAL '1 day', 'Sales process is well structured', '550e8400-e29b-41d4-a716-446655440009'),
('ii0e8400-e29b-41d4-a716-446655440003', 'hh0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440006', CURRENT_DATE, 'Support tools are intuitive and easy to use', '550e8400-e29b-41d4-a716-446655440010');

-- Insert sample onboarding feedback
INSERT INTO onboarding_feedback (id, process_id, step_id, rating, feedback_text, feedback_type, submitted_by) VALUES
('jj0e8400-e29b-41d4-a716-446655440001', 'hh0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', 5, 'Excellent company introduction, very informative', 'step', '550e8400-e29b-41d4-a716-446655440009'),
('jj0e8400-e29b-41d4-a716-446655440002', 'hh0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440002', 4, 'Sales process training was comprehensive', 'step', '550e8400-e29b-41d4-a716-446655440009'),
('jj0e8400-e29b-41d4-a716-446655440003', 'hh0e8400-e29b-41d4-a716-446655440001', NULL, 4, 'Overall onboarding experience has been positive', 'overall', '550e8400-e29b-41d4-a716-446655440009'),
('jj0e8400-e29b-41d4-a716-446655440004', 'hh0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440006', 5, 'Support tools training was very helpful', 'step', '550e8400-e29b-41d4-a716-446655440010');

-- Insert step dependencies
INSERT INTO step_dependencies (id, step_id, depends_on_step_id) VALUES
('kk0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440001'),
('kk0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440003', 'ee0e8400-e29b-41d4-a716-446655440002'),
('kk0e8400-e29b-41d4-a716-446655440003', 'ee0e8400-e29b-41d4-a716-446655440004', 'ee0e8400-e29b-41d4-a716-446655440003'),
('kk0e8400-e29b-41d4-a716-446655440004', 'ee0e8400-e29b-41d4-a716-446655440005', 'ee0e8400-e29b-41d4-a716-446655440004'),
('kk0e8400-e29b-41d4-a716-446655440005', 'ee0e8400-e29b-41d4-a716-446655440007', 'ee0e8400-e29b-41d4-a716-446655440006'),
('kk0e8400-e29b-41d4-a716-446655440006', 'ee0e8400-e29b-41d4-a716-446655440008', 'ee0e8400-e29b-41d4-a716-446655440007');
``` 