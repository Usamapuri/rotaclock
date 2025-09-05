-- Add tenant_id to all tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE company_holidays ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE onboarding_templates ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE onboarding_steps ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE onboarding_processes ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;
ALTER TABLE step_completions ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL;

-- Add tenant_id indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_holidays_tenant ON company_holidays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_tenant ON onboarding_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_tenant ON onboarding_steps(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_tenant ON onboarding_processes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_step_completions_tenant ON step_completions(tenant_id);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_employees_tenant_active ON employees(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_dept ON employees(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant_date ON shift_assignments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_employee ON time_entries(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id);
