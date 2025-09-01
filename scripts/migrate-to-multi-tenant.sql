-- Multi-Tenant Migration Script
-- This script adds tenant_id to all existing tables and migrates existing data to demo tenant

BEGIN;

-- 1. First, ensure the demo organization exists
INSERT INTO organizations (
    tenant_id,
    name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    is_verified,
    is_active
) VALUES (
    'demo',
    'Demo Organization',
    'demo-organization',
    'demo@rotacloud.com',
    'trial',
    'basic',
    true,
    true
) ON CONFLICT (tenant_id) DO NOTHING;

-- Get the demo organization ID
DO $$
DECLARE
    demo_org_id UUID;
BEGIN
    SELECT id INTO demo_org_id FROM organizations WHERE tenant_id = 'demo';
    
    -- 2. Add tenant_id column to employees_new
    ALTER TABLE employees_new ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE employees_new ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing employees
    UPDATE employees_new SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 3. Add tenant_id to shift_templates
    ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE shift_templates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing shift templates
    UPDATE shift_templates SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 4. Add tenant_id to shift_assignments_new
    ALTER TABLE shift_assignments_new ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE shift_assignments_new ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing shift assignments
    UPDATE shift_assignments_new SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 5. Add tenant_id to shift_logs
    ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE shift_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing shift logs
    UPDATE shift_logs SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 6. Add tenant_id to payroll_periods
    ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE payroll_periods ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing payroll periods
    UPDATE payroll_periods SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 7. Add tenant_id to payroll_records
    ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing payroll records
    UPDATE payroll_records SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 8. Add tenant_id to employee_salaries
    ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing employee salaries
    UPDATE employee_salaries SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 9. Add tenant_id to payroll_deductions
    ALTER TABLE payroll_deductions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE payroll_deductions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing payroll deductions
    UPDATE payroll_deductions SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 10. Add tenant_id to payroll_bonuses
    ALTER TABLE payroll_bonuses ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
    ALTER TABLE payroll_bonuses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
    
    -- Update organization_id for existing payroll bonuses
    UPDATE payroll_bonuses SET organization_id = demo_org_id WHERE organization_id IS NULL;
    
    -- 11. Add tenant_id to notifications (if table exists)
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
            ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
            UPDATE notifications SET organization_id = demo_org_id WHERE organization_id IS NULL;
        END IF;
    END $$;
    
    -- 12. Add tenant_id to teams (if table exists)
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
            ALTER TABLE teams ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
            ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
            UPDATE teams SET organization_id = demo_org_id WHERE organization_id IS NULL;
        END IF;
    END $$;
    
    -- 13. Add tenant_id to projects (if table exists)
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'projects') THEN
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'demo';
            ALTER TABLE projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
            UPDATE projects SET organization_id = demo_org_id WHERE organization_id IS NULL;
        END IF;
    END $$;
    
END $$;

-- 14. Create composite indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees_new(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees_new(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_tenant_id ON shift_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_templates_org_id ON shift_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant_id ON shift_assignments_new(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_org_id ON shift_assignments_new(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_tenant_id ON shift_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_org_id ON shift_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant_id ON payroll_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_org_id ON payroll_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_tenant_id ON payroll_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_org_id ON payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_tenant_id ON employee_salaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_salaries_org_id ON employee_salaries(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_tenant_id ON payroll_deductions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_org_id ON payroll_deductions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_tenant_id ON payroll_bonuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_org_id ON payroll_bonuses(organization_id);

-- 15. Add constraints to ensure tenant_id is not null for new records
ALTER TABLE employees_new ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE shift_templates ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE shift_assignments_new ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE shift_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_periods ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_salaries ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_deductions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll_bonuses ALTER COLUMN tenant_id SET NOT NULL;

COMMIT;

-- 16. Verify migration
SELECT 
    'employees_new' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
FROM employees_new
UNION ALL
SELECT 
    'shift_logs' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
FROM shift_logs
UNION ALL
SELECT 
    'payroll_records' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN tenant_id = 'demo' THEN 1 END) as demo_records
FROM payroll_records;
