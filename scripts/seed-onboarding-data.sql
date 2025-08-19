-- Insert sample employees
INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hire_date, is_active) VALUES
('EMP001', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Manager', '2023-01-15', true),
('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Sales', 'Sales Associate', '2024-01-08', true),
('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Support', 'Support Specialist', '2023-06-20', true),
('EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'HR', 'HR Manager', '2022-03-10', true),
('EMP005', 'David', 'Brown', 'david.brown@company.com', 'IT', 'IT Administrator', '2023-02-28', true),
('EMP006', 'Lisa', 'Davis', 'lisa.davis@company.com', 'Marketing', 'Marketing Coordinator', '2023-09-12', true),
('ADMIN001', 'Admin', 'User', 'admin@company.com', 'Administration', 'System Administrator', '2022-01-01', true);

-- Insert sample onboarding documents
INSERT INTO onboarding_documents (name, type, file_url, required) VALUES
('Employee Handbook 2024', 'handbook', '/documents/employee-handbook-2024.pdf', true),
('Code of Conduct', 'policy', '/documents/code-of-conduct.pdf', true),
('Workplace Safety Training', 'training', '/documents/safety-training.pdf', true),
('IT Security Policy', 'policy', '/documents/it-security-policy.pdf', true),
('Benefits Overview', 'handbook', '/documents/benefits-overview.pdf', false),
('Emergency Procedures', 'policy', '/documents/emergency-procedures.pdf', true),
('Sales Training Manual', 'training', '/documents/sales-training-manual.pdf', false),
('Customer Service Guidelines', 'handbook', '/documents/customer-service-guidelines.pdf', false);

-- Insert sample onboarding template for Sales Associate
INSERT INTO onboarding_templates (name, description, department, position, total_estimated_time, is_active) VALUES
('Sales Associate Onboarding', 'Complete onboarding process for new sales team members', 'Sales', 'Sales Associate', 555, true);

-- Get the template ID for Sales Associate
DO $$
DECLARE
    sales_template_id UUID;
BEGIN
    SELECT id INTO sales_template_id FROM onboarding_templates WHERE name = 'Sales Associate Onboarding';
    
    -- Insert onboarding steps for Sales Associate template
    INSERT INTO onboarding_steps (template_id, title, description, category, required, estimated_time, step_order, assigned_to, instructions) VALUES
    (sales_template_id, 'Welcome & Introduction', 'Meet the team and get oriented with the company', 'orientation', true, 60, 1, 'HR Manager', 'Please attend the welcome meeting scheduled for 9:00 AM in the conference room.'),
    (sales_template_id, 'Employee Handbook Review', 'Read and acknowledge company policies and procedures', 'documentation', true, 90, 2, 'HR Manager', 'Please read the employee handbook thoroughly and sign the acknowledgment form.'),
    (sales_template_id, 'System Access Setup', 'Create accounts and provide access to necessary systems', 'setup', true, 45, 3, 'IT Department', 'IT will contact you to set up your accounts. Please have your ID ready.'),
    (sales_template_id, 'Safety Training', 'Complete workplace safety and emergency procedures training', 'training', true, 60, 4, 'Safety Officer', 'Complete the online safety training module and attend the safety briefing.'),
    (sales_template_id, 'Sales Training Program', 'Complete sales methodology and product training', 'training', true, 240, 5, 'Sales Manager', 'Attend all sales training sessions and complete the product knowledge assessment.'),
    (sales_template_id, 'Job Shadowing', 'Shadow experienced team member for practical learning', 'training', true, 120, 6, 'Sales Manager', 'You will be paired with a senior sales associate for hands-on learning.');
END $$;

-- Insert sample onboarding template for Support Specialist
INSERT INTO onboarding_templates (name, description, department, position, total_estimated_time, is_active) VALUES
('Support Specialist Onboarding', 'Complete onboarding process for new support team members', 'Support', 'Support Specialist', 480, true);

-- Get the template ID for Support Specialist
DO $$
DECLARE
    support_template_id UUID;
BEGIN
    SELECT id INTO support_template_id FROM onboarding_templates WHERE name = 'Support Specialist Onboarding';
    
    -- Insert onboarding steps for Support Specialist template
    INSERT INTO onboarding_steps (template_id, title, description, category, required, estimated_time, step_order, assigned_to, instructions) VALUES
    (support_template_id, 'Welcome & Introduction', 'Meet the team and get oriented with the company', 'orientation', true, 60, 1, 'HR Manager', 'Please attend the welcome meeting scheduled for 9:00 AM in the conference room.'),
    (support_template_id, 'Employee Handbook Review', 'Read and acknowledge company policies and procedures', 'documentation', true, 90, 2, 'HR Manager', 'Please read the employee handbook thoroughly and sign the acknowledgment form.'),
    (support_template_id, 'System Access Setup', 'Create accounts and provide access to necessary systems', 'setup', true, 45, 3, 'IT Department', 'IT will contact you to set up your accounts. Please have your ID ready.'),
    (support_template_id, 'Customer Service Training', 'Learn customer service best practices and communication skills', 'training', true, 120, 4, 'Support Manager', 'Complete the customer service training modules and practice scenarios.'),
    (support_template_id, 'Product Knowledge Training', 'Learn about our products and services', 'training', true, 180, 5, 'Product Manager', 'Study product documentation and complete knowledge assessments.'),
    (support_template_id, 'Support Tools Training', 'Learn to use support ticketing and communication tools', 'training', true, 90, 6, 'Support Manager', 'Get hands-on training with our support tools and systems.');
END $$;

-- Insert sample onboarding process
DO $$
DECLARE
    sales_template_id UUID;
    jane_employee_id UUID;
BEGIN
    SELECT id INTO sales_template_id FROM onboarding_templates WHERE name = 'Sales Associate Onboarding';
    SELECT id INTO jane_employee_id FROM employees WHERE employee_id = 'EMP002';
    
    INSERT INTO onboarding_processes (employee_id, employee_name, template_id, template_name, start_date, expected_completion_date, status, assigned_mentor, notes, progress) VALUES
    (jane_employee_id, 'Jane Smith', sales_template_id, 'Sales Associate Onboarding', '2024-01-08', '2024-01-15', 'in-progress', 'John Doe', 'New hire is very enthusiastic and eager to learn', 33.33);
END $$;

-- Insert sample step completions
DO $$
DECLARE
    process_id UUID;
    welcome_step_id UUID;
    handbook_step_id UUID;
BEGIN
    SELECT p.id INTO process_id FROM onboarding_processes p WHERE p.employee_name = 'Jane Smith';
    SELECT s.id INTO welcome_step_id FROM onboarding_steps s 
    JOIN onboarding_templates t ON t.id = s.template_id 
    WHERE t.name = 'Sales Associate Onboarding' AND s.step_order = 1;
    SELECT s.id INTO handbook_step_id FROM onboarding_steps s 
    JOIN onboarding_templates t ON t.id = s.template_id 
    WHERE t.name = 'Sales Associate Onboarding' AND s.step_order = 2;
    
    INSERT INTO step_completions (process_id, step_id, completed_at, feedback) VALUES
    (process_id, welcome_step_id, '2024-01-08 10:00:00', 'Great welcome session, felt very welcomed by the team'),
    (process_id, handbook_step_id, '2024-01-08 14:30:00', 'Handbook was comprehensive and easy to understand');
END $$;

-- Link documents to steps
DO $$
DECLARE
    handbook_step_id UUID;
    safety_step_id UUID;
    handbook_doc_id UUID;
    conduct_doc_id UUID;
    safety_doc_id UUID;
    security_doc_id UUID;
BEGIN
    -- Get step IDs
    SELECT s.id INTO handbook_step_id FROM onboarding_steps s 
    JOIN onboarding_templates t ON t.id = s.template_id 
    WHERE t.name = 'Sales Associate Onboarding' AND s.title = 'Employee Handbook Review';
    
    SELECT s.id INTO safety_step_id FROM onboarding_steps s 
    JOIN onboarding_templates t ON t.id = s.template_id 
    WHERE t.name = 'Sales Associate Onboarding' AND s.title = 'Safety Training';
    
    -- Get document IDs
    SELECT id INTO handbook_doc_id FROM onboarding_documents WHERE name = 'Employee Handbook 2024';
    SELECT id INTO conduct_doc_id FROM onboarding_documents WHERE name = 'Code of Conduct';
    SELECT id INTO safety_doc_id FROM onboarding_documents WHERE name = 'Workplace Safety Training';
    SELECT id INTO security_doc_id FROM onboarding_documents WHERE name = 'IT Security Policy';
    
    -- Link documents to steps
    INSERT INTO step_documents (step_id, document_id) VALUES
    (handbook_step_id, handbook_doc_id),
    (handbook_step_id, conduct_doc_id),
    (safety_step_id, safety_doc_id),
    (safety_step_id, security_doc_id);
END $$;

-- Insert sample feedback
DO $$
DECLARE
    process_id UUID;
    welcome_step_id UUID;
BEGIN
    SELECT p.id INTO process_id FROM onboarding_processes p WHERE p.employee_name = 'Jane Smith';
    SELECT s.id INTO welcome_step_id FROM onboarding_steps s 
    JOIN onboarding_templates t ON t.id = s.template_id 
    WHERE t.name = 'Sales Associate Onboarding' AND s.step_order = 1;
    
    INSERT INTO onboarding_feedback (process_id, step_id, rating, feedback_text, feedback_type) VALUES
    (process_id, welcome_step_id, 5, 'Excellent welcome experience, very well organized', 'step'),
    (process_id, NULL, 4, 'Overall onboarding process is going well so far', 'overall');
END $$;
