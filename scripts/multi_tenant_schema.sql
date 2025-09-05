-- Multi-tenant Database Schema for RotaClock
-- Purpose: Create a fresh multi-tenant database with proper tenant isolation and relationships

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core Organization and Tenant Tables
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT,
    subscription_status TEXT DEFAULT 'trial',
    subscription_plan TEXT DEFAULT 'basic',
    trial_ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- User Management Tables
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_code TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'team_lead', 'project_manager', 'employee')),
    department TEXT,
    job_position TEXT,
    hire_date DATE,
    manager_id UUID REFERENCES employees(id),
    team_id UUID,
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10,2),
    max_hours_per_week INTEGER DEFAULT 40,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email),
    UNIQUE(tenant_id, employee_code)
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    department TEXT,
    lead_id UUID REFERENCES employees(id),
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Scheduling Tables
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department TEXT,
    required_staff INTEGER DEFAULT 1,
    hourly_rate DECIMAL(10,2),
    color TEXT DEFAULT '#3B82F6',
    break_duration INTEGER DEFAULT 60, -- in minutes
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status TEXT CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled', 'swap-requested')) DEFAULT 'assigned',
    assigned_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, employee_id, template_id, date)
);

-- Time Tracking Tables
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    break_start TIMESTAMPTZ,
    break_end TIMESTAMPTZ,
    total_hours DECIMAL(5,2),
    break_hours DECIMAL(3,2) DEFAULT 0,
    status TEXT CHECK (status IN ('in-progress', 'completed', 'break', 'overtime')) DEFAULT 'in-progress',
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Management Tables
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    requires_approval BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(4,1) NOT NULL,
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Swap Management
CREATE TABLE shift_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    original_assignment_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
    requested_assignment_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
    admin_notes TEXT,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Management
CREATE TABLE payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('draft', 'processing', 'completed', 'cancelled')) DEFAULT 'draft',
    processed_by UUID REFERENCES employees(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, start_date, end_date)
);

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
    payment_status TEXT CHECK (status IN ('pending', 'processing', 'paid', 'cancelled')) DEFAULT 'pending',
    payment_date DATE,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, period_id, employee_id)
);

-- Notification System
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave', 'swap')) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
-- Organizations & Tenants
CREATE INDEX idx_organizations_subscription ON organizations(subscription_status, subscription_plan);
CREATE INDEX idx_organizations_domain ON organizations(domain);

-- Employees
CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_org ON employees(organization_id);
CREATE INDEX idx_employees_tenant_role ON employees(tenant_id, role);
CREATE INDEX idx_employees_tenant_dept ON employees(tenant_id, department);
CREATE INDEX idx_employees_tenant_active ON employees(tenant_id, is_active);
CREATE INDEX idx_employees_tenant_email ON employees(tenant_id, email);
CREATE INDEX idx_employees_tenant_code ON employees(tenant_id, employee_code);

-- Teams
CREATE INDEX idx_teams_tenant ON teams(tenant_id);
CREATE INDEX idx_teams_tenant_dept ON teams(tenant_id, department);
CREATE INDEX idx_teams_tenant_active ON teams(tenant_id, is_active);

-- Shifts
CREATE INDEX idx_shift_templates_tenant ON shift_templates(tenant_id);
CREATE INDEX idx_shift_templates_tenant_active ON shift_templates(tenant_id, is_active);
CREATE INDEX idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX idx_shift_assignments_tenant_date ON shift_assignments(tenant_id, date);
CREATE INDEX idx_shift_assignments_tenant_emp ON shift_assignments(tenant_id, employee_id);
CREATE INDEX idx_shift_assignments_tenant_status ON shift_assignments(tenant_id, status);

-- Time Entries
CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_tenant_emp ON time_entries(tenant_id, employee_id);
CREATE INDEX idx_time_entries_tenant_date ON time_entries(tenant_id, date);
CREATE INDEX idx_time_entries_tenant_status ON time_entries(tenant_id, status);

-- Leave Management
CREATE INDEX idx_leave_requests_tenant ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_tenant_emp ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_requests_tenant_dates ON leave_requests(tenant_id, start_date, end_date);
CREATE INDEX idx_leave_requests_tenant_status ON leave_requests(tenant_id, status);

-- Shift Swaps
CREATE INDEX idx_shift_swaps_tenant ON shift_swaps(tenant_id);
CREATE INDEX idx_shift_swaps_tenant_req ON shift_swaps(tenant_id, requester_id);
CREATE INDEX idx_shift_swaps_tenant_target ON shift_swaps(tenant_id, target_id);
CREATE INDEX idx_shift_swaps_tenant_status ON shift_swaps(tenant_id, status);

-- Payroll
CREATE INDEX idx_payroll_periods_tenant ON payroll_periods(tenant_id);
CREATE INDEX idx_payroll_periods_tenant_dates ON payroll_periods(tenant_id, start_date, end_date);
CREATE INDEX idx_payroll_records_tenant ON payroll_records(tenant_id);
CREATE INDEX idx_payroll_records_tenant_emp ON payroll_records(tenant_id, employee_id);
CREATE INDEX idx_payroll_records_tenant_period ON payroll_records(tenant_id, period_id);

-- Notifications
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_tenant_emp ON notifications(tenant_id, employee_id);
CREATE INDEX idx_notifications_tenant_read ON notifications(tenant_id, read);

-- Audit Logs
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_tenant_emp ON audit_logs(tenant_id, employee_id);
CREATE INDEX idx_audit_logs_tenant_action ON audit_logs(tenant_id, action);
CREATE INDEX idx_audit_logs_tenant_entity ON audit_logs(tenant_id, entity_type, entity_id);

-- Sample Data: Create two organizations with two employees each
INSERT INTO organizations (id, name, subscription_status, subscription_plan) VALUES
    ('11111111-1111-1111-1111-111111111111', 'RotaClock Demo', 'active', 'enterprise'),
    ('22222222-2222-2222-2222-222222222222', 'LogiCode Services', 'trial', 'basic');

INSERT INTO tenants (id, organization_id, name) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'RotaClock Demo'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'LogiCode Services');

-- RotaClock Demo Employees
INSERT INTO employees (
    id, tenant_id, organization_id, employee_code, first_name, last_name, 
    email, password_hash, role, department, job_position, is_active
) VALUES
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'EMP001',
        'John',
        'Doe',
        'john.doe@rotaclock.demo',
        crypt('password123', gen_salt('bf')),
        'admin',
        'Management',
        'System Administrator',
        true
    ),
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        'EMP002',
        'Jane',
        'Smith',
        'jane.smith@rotaclock.demo',
        crypt('password123', gen_salt('bf')),
        'team_lead',
        'Customer Support',
        'Team Lead',
        true
    );

-- LogiCode Services Employees
INSERT INTO employees (
    id, tenant_id, organization_id, employee_code, first_name, last_name, 
    email, password_hash, role, department, job_position, is_active
) VALUES
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'EMP001',
        'Alex',
        'Brown',
        'alex.brown@logicode.com',
        crypt('password123', gen_salt('bf')),
        'admin',
        'Management',
        'System Administrator',
        true
    ),
    (
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222222',
        'EMP002',
        'Sarah',
        'Wilson',
        'sarah.wilson@logicode.com',
        crypt('password123', gen_salt('bf')),
        'employee',
        'Customer Support',
        'Support Agent',
        true
    );
