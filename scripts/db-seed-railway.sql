-- Demo seed after full schema apply (password for all logins: password123)
-- Hashes are bcryptjs-compatible ($2b$). Login: admin@rotaclock.local / password123

INSERT INTO organizations (id, tenant_id, name, slug, email, subscription_status, subscription_plan, is_active, country)
VALUES (
  'a0000001-0001-4001-8001-000000000001',
  'rotaclock-main',
  'RotaClock Call Center',
  'rotaclock-main',
  'owner@rotaclock.local',
  'active',
  'professional',
  true,
  'UK'
);

INSERT INTO tenant_settings (tenant_id, allow_manager_approvals, pay_period_type, week_start_day)
VALUES ('rotaclock-main', true, 'weekly', 1);

-- Primary admin (API auth + getTenantContext)
INSERT INTO employees (
  id, tenant_id, organization_id, employee_code, first_name, last_name, email,
  password_hash, role, is_active, department, job_position, address, phone
) VALUES (
  'b0000001-0001-4001-8001-000000000001',
  'rotaclock-main',
  'a0000001-0001-4001-8001-000000000001',
  'EMP001',
  'System',
  'Administrator',
  'admin@rotaclock.local',
  '$2b$10$1kIPX7zyXBmTUaD2HVKoSOQTgk2qJNy1oHIAMSH3HBlZT5Mmm9Y/W',
  'admin',
  true,
  'HQ',
  'Administrator',
  '1 Demo Street',
  '+44 20 0000 0001'
);

-- Demo agent (schedule / employee portal)
INSERT INTO employees (
  id, tenant_id, organization_id, employee_code, first_name, last_name, email,
  password_hash, role, is_active, department, job_position
) VALUES (
  'c0000001-0001-4001-8001-000000000001',
  'rotaclock-main',
  'a0000001-0001-4001-8001-000000000001',
  'EMP002',
  'Jamie',
  'Agent',
  'agent@rotaclock.local',
  '$2b$10$1kIPX7zyXBmTUaD2HVKoSOQTgk2qJNy1oHIAMSH3HBlZT5Mmm9Y/W',
  'agent',
  true,
  'Inbound',
  'Customer Advisor'
);

INSERT INTO roles (tenant_id, organization_id, name, display_name, description, permissions, dashboard_access) VALUES
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'admin', 'Administrator', 'Full tenant access', '{}', '["admin","dashboard"]'),
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'manager', 'Manager', 'Location-scoped management', '{}', '["manager"]'),
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'agent', 'Agent', 'Call center agent', '{}', '["employee"]'),
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'employee', 'Employee', 'Standard employee', '{}', '["employee"]'),
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'team_lead', 'TeamLead', 'Team lead', '{}', '["employee"]'),
('rotaclock-main', 'a0000001-0001-4001-8001-000000000001', 'project_manager', 'ProjectManager', 'Project manager', '{}', '[]');

INSERT INTO locations (id, tenant_id, organization_id, name, description, is_active)
VALUES (
  'd0000001-0001-4001-8001-000000000001',
  'rotaclock-main',
  'a0000001-0001-4001-8001-000000000001',
  'Main Site',
  'Primary call floor',
  true
);

UPDATE employees SET location_id = 'd0000001-0001-4001-8001-000000000001'
WHERE id IN ('b0000001-0001-4001-8001-000000000001', 'c0000001-0001-4001-8001-000000000001');

INSERT INTO shift_templates (
  id, tenant_id, organization_id, name, start_time, end_time, department, required_staff, color, is_active, created_by
) VALUES (
  'e0000001-0001-4001-8001-000000000001',
  'rotaclock-main',
  'a0000001-0001-4001-8001-000000000001',
  'Day — Inbound',
  '09:00',
  '17:00',
  'Inbound',
  1,
  '#2563eb',
  true,
  'b0000001-0001-4001-8001-000000000001'
);
