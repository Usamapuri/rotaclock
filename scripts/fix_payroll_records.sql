-- Fix payroll_records table
DROP TABLE IF EXISTS payroll_records;

CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(10,2) NOT NULL,
    hours_worked DECIMAL(8,2) DEFAULT 0.00,
    hourly_pay DECIMAL(10,2) DEFAULT 0.00,
    overtime_hours DECIMAL(8,2) DEFAULT 0.00,
    overtime_pay DECIMAL(10,2) DEFAULT 0.00,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    deductions_amount DECIMAL(10,2) DEFAULT 0.00,
    gross_pay DECIMAL(10,2) DEFAULT 0.00,
    net_pay DECIMAL(10,2) DEFAULT 0.00,
    payment_status TEXT CHECK (payment_status IN ('pending', 'processing', 'paid', 'cancelled')) DEFAULT 'pending',
    payment_date DATE,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, period_id, employee_id)
);

-- Recreate indexes for payroll_records
CREATE INDEX idx_payroll_records_tenant ON payroll_records(tenant_id);
CREATE INDEX idx_payroll_records_tenant_emp ON payroll_records(tenant_id, employee_id);
CREATE INDEX idx_payroll_records_tenant_period ON payroll_records(tenant_id, period_id);
