-- Use a hardcoded tenant_id for sample data
DO $$ 
DECLARE
    current_tenant_id UUID := '550e8400-e29b-41d4-a716-446655440000'::UUID;
BEGIN

    -- Insert sample projects
    INSERT INTO projects (id, tenant_id, name, description, is_active) VALUES
    ('990e8400-e29b-41d4-a716-446655440001', current_tenant_id, 'Website Redesign', 'Company website redesign project', true),
    ('990e8400-e29b-41d4-a716-446655440002', current_tenant_id, 'Mobile App Development', 'Customer mobile application development', true),
    ('990e8400-e29b-41d4-a716-446655440003', current_tenant_id, 'CRM Implementation', 'New CRM system implementation', true);

    -- Insert sample teams
    INSERT INTO teams (id, tenant_id, name, department, project_id, is_active) VALUES
    ('aa0e8400-e29b-41d4-a716-446655440001', current_tenant_id, 'Frontend Team', 'Development', '990e8400-e29b-41d4-a716-446655440001', true),
    ('aa0e8400-e29b-41d4-a716-446655440002', current_tenant_id, 'Backend Team', 'Development', '990e8400-e29b-41d4-a716-446655440001', true),
    ('aa0e8400-e29b-41d4-a716-446655440003', current_tenant_id, 'Mobile Team', 'Development', '990e8400-e29b-41d4-a716-446655440002', true),
    ('aa0e8400-e29b-41d4-a716-446655440004', current_tenant_id, 'Support Team A', 'Support', NULL, true),
    ('aa0e8400-e29b-41d4-a716-446655440005', current_tenant_id, 'Sales Team 1', 'Sales', NULL, true);

-- Update existing employees with team assignments and roles
UPDATE employees SET 
    team_id = 'aa0e8400-e29b-41d4-a716-446655440001',
    role = 'team_lead'
WHERE id = '550e8400-e29b-41d4-a716-446655440003';

UPDATE employees SET 
    team_id = 'aa0e8400-e29b-41d4-a716-446655440004',
    role = 'team_lead'
WHERE id = '550e8400-e29b-41d4-a716-446655440005';

-- Assign other employees to teams
UPDATE employees SET 
    team_id = 'aa0e8400-e29b-41d4-a716-446655440001'
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

UPDATE employees SET 
    team_id = 'aa0e8400-e29b-41d4-a716-446655440004'
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

    -- Insert manager project assignments
    INSERT INTO manager_projects (tenant_id, project_id, employee_id) VALUES
    (current_tenant_id, '990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'),
    (current_tenant_id, '990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440005');

    -- Insert team assignments
    INSERT INTO team_assignments (tenant_id, team_id, employee_id, is_active) VALUES
    (current_tenant_id, 'aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', true),
    (current_tenant_id, 'aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', true),
    (current_tenant_id, 'aa0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', true),
    (current_tenant_id, 'aa0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', true);

    -- Insert sample performance metrics
    INSERT INTO performance_metrics (tenant_id, employee_id, quality_score, productivity_score, review_period_start, review_period_end, reviewed_by) VALUES
    (current_tenant_id, '550e8400-e29b-41d4-a716-446655440001', 4.5, 4.2, '2024-01-01', '2024-03-31', '550e8400-e29b-41d4-a716-446655440003'),
    (current_tenant_id, '550e8400-e29b-41d4-a716-446655440002', 4.3, 4.0, '2024-01-01', '2024-03-31', '550e8400-e29b-41d4-a716-446655440005'),
    (current_tenant_id, '550e8400-e29b-41d4-a716-446655440003', 4.8, 4.7, '2024-01-01', '2024-03-31', '550e8400-e29b-41d4-a716-446655440005'),
    (current_tenant_id, '550e8400-e29b-41d4-a716-446655440005', 4.6, 4.5, '2024-01-01', '2024-03-31', '550e8400-e29b-41d4-a716-446655440003');
END $$;
