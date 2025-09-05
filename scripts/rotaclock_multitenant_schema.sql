-- RotaClock Multi-Tenant Schema (consolidated)
-- Safe to run multiple times (IF NOT EXISTS / ON CONFLICT used where possible)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================
-- Core Organization & Tenanting
-- =============================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Pakistan',
  postal_code VARCHAR(20),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  subscription_status VARCHAR(20) DEFAULT 'trial',
  subscription_plan VARCHAR(20) DEFAULT 'basic',
  trial_start_date TIMESTAMPTZ DEFAULT NOW(),
  trial_end_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'Asia/Karachi',
  currency VARCHAR(3) DEFAULT 'PKR',
  language VARCHAR(10) DEFAULT 'en',
  max_employees INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- =============================
-- Tenant-scoped uniqueness for composite FKs
-- =============================
ALTER TABLE IF EXISTS organizations
  ADD CONSTRAINT organizations_tenant_id_id_unique UNIQUE (tenant_id, id);

-- =============
-- User & Teams
-- =============
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  employee_code VARCHAR(64),
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  password_hash TEXT,
  role VARCHAR(32) DEFAULT 'employee',
  department VARCHAR(120),
  job_position VARCHAR(120),
  hire_date DATE,
  manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  team_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  hourly_rate NUMERIC(10,2),
  max_hours_per_week INTEGER DEFAULT 40,
  last_login_at TIMESTAMPTZ,
  is_online BOOLEAN DEFAULT FALSE,
  last_online TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, email),
  UNIQUE (tenant_id, employee_code)
);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_role ON employees(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
ALTER TABLE IF EXISTS employees
  ADD CONSTRAINT employees_tenant_id_id_unique UNIQUE (tenant_id, id);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
ALTER TABLE IF EXISTS projects
  ADD CONSTRAINT projects_tenant_id_id_unique UNIQUE (tenant_id, id);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(120),
  team_lead_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
ALTER TABLE IF EXISTS teams
  ADD CONSTRAINT teams_tenant_id_id_unique UNIQUE (tenant_id, id);
-- Enforce tenant-matched references
ALTER TABLE IF EXISTS teams
  ADD CONSTRAINT teams_lead_employee_fk
  FOREIGN KEY (tenant_id, team_lead_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE IF EXISTS teams
  ADD CONSTRAINT teams_project_fk
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, team_id, employee_id, assigned_date)
);
ALTER TABLE IF EXISTS team_assignments
  ADD CONSTRAINT team_assignments_team_fk
  FOREIGN KEY (tenant_id, team_id) REFERENCES teams(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_assignments_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS manager_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, manager_id, project_id)
);

CREATE TABLE IF NOT EXISTS manager_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, manager_id, team_id)
);

-- =============
-- Scheduling
-- =============
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  department VARCHAR(120),
  required_staff INTEGER DEFAULT 1,
  hourly_rate NUMERIC(10,2),
  color VARCHAR(32) DEFAULT '#3B82F6',
  break_duration INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_shift_templates_tenant ON shift_templates(tenant_id);
ALTER TABLE IF EXISTS shift_templates
  ADD CONSTRAINT shift_templates_tenant_id_id_unique UNIQUE (tenant_id, id);
ALTER TABLE IF EXISTS shift_templates
  ADD CONSTRAINT shift_templates_created_by_fk
  FOREIGN KEY (tenant_id, created_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  override_name VARCHAR(255),
  override_start_time TIME,
  override_end_time TIME,
  override_color VARCHAR(32),
  status VARCHAR(32) DEFAULT 'assigned' CHECK (status IN ('assigned','confirmed','completed','cancelled','swap-requested','in_progress')),
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, date)
);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_tenant_date ON shift_assignments(tenant_id, date);
ALTER TABLE IF EXISTS shift_assignments
  ADD CONSTRAINT shift_assignments_tenant_id_id_unique UNIQUE (tenant_id, id);
ALTER TABLE IF EXISTS shift_assignments
  ADD CONSTRAINT shift_assignments_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_assignments_template_fk
  FOREIGN KEY (tenant_id, template_id) REFERENCES shift_templates(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_assignments_assigned_by_fk
  FOREIGN KEY (tenant_id, assigned_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =============
-- Time Tracking
-- =============
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
  date DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  total_hours NUMERIC(8,2),
  break_hours NUMERIC(6,2) DEFAULT 0,
  status VARCHAR(24) DEFAULT 'in-progress' CHECK (status IN ('in-progress','completed','break','overtime')),
  notes TEXT,
  location_lat NUMERIC(10,8),
  location_lng NUMERIC(11,8),
  -- compatibility fields for verify-start route
  entry_type VARCHAR(50),
  "timestamp" TIMESTAMPTZ,
  location_data JSONB,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_emp ON time_entries(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant_status ON time_entries(tenant_id, status);
ALTER TABLE IF EXISTS time_entries
  ADD CONSTRAINT time_entries_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT time_entries_assignment_fk
  FOREIGN KEY (tenant_id, shift_assignment_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT time_entries_assignment_fk2
  FOREIGN KEY (tenant_id, assignment_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- Legacy shift logs (still referenced by some routes)
CREATE TABLE IF NOT EXISTS shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  total_shift_hours NUMERIC(8,2),
  break_time_used NUMERIC(8,2) DEFAULT 0,
  max_break_allowed NUMERIC(8,2) DEFAULT 1.0,
  is_late BOOLEAN DEFAULT FALSE,
  is_no_show BOOLEAN DEFAULT FALSE,
  late_minutes INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  total_calls_taken INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  shift_remarks TEXT,
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS shift_logs
  ADD CONSTRAINT shift_logs_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_logs_assignment_fk
  FOREIGN KEY (tenant_id, shift_assignment_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS break_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  shift_log_id UUID NOT NULL REFERENCES shift_logs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  break_start_time TIMESTAMPTZ NOT NULL,
  break_end_time TIMESTAMPTZ,
  break_duration NUMERIC(8,2),
  break_type VARCHAR(20) DEFAULT 'lunch',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS break_logs
  ADD CONSTRAINT break_logs_shift_fk
  FOREIGN KEY (tenant_id, shift_log_id) REFERENCES shift_logs(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT break_logs_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_shifts INTEGER DEFAULT 0,
  total_hours_worked NUMERIC(8,2) DEFAULT 0,
  total_break_time NUMERIC(8,2) DEFAULT 0,
  late_count INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  on_time_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, date)
);
ALTER TABLE IF EXISTS attendance_summary
  ADD CONSTRAINT attendance_summary_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- ==================
-- Leave Management
-- ==================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested NUMERIC(6,1) NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','cancelled')),
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant ON leave_requests(tenant_id);
ALTER TABLE IF EXISTS leave_requests
  ADD CONSTRAINT leave_requests_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT leave_requests_approved_by_fk
  FOREIGN KEY (tenant_id, approved_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- ================
-- Shift Swaps
-- ================
CREATE TABLE IF NOT EXISTS shift_swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  original_shift_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  requested_shift_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','cancelled')),
  admin_notes TEXT,
  approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_tenant ON shift_swaps(tenant_id);
ALTER TABLE IF EXISTS shift_swaps
  ADD CONSTRAINT shift_swaps_requester_fk
  FOREIGN KEY (tenant_id, requester_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_swaps_target_fk
  FOREIGN KEY (tenant_id, target_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_swaps_original_fk
  FOREIGN KEY (tenant_id, original_shift_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_swaps_requested_fk
  FOREIGN KEY (tenant_id, requested_shift_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_swaps_approved_by_fk
  FOREIGN KEY (tenant_id, approved_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =============
-- Payroll
-- =============
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  period_name VARCHAR(120),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','active','processing','completed','cancelled')),
  processed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, start_date, end_date)
);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant ON payroll_periods(tenant_id);
ALTER TABLE IF EXISTS payroll_periods
  ADD CONSTRAINT payroll_periods_tenant_id_id_unique UNIQUE (tenant_id, id);
ALTER TABLE IF EXISTS payroll_periods
  ADD CONSTRAINT payroll_periods_processed_by_fk
  FOREIGN KEY (tenant_id, processed_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  payroll_period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_email VARCHAR(255),
  base_salary NUMERIC(12,2) DEFAULT 0,
  hours_worked NUMERIC(10,2) DEFAULT 0,
  hourly_pay NUMERIC(12,2) DEFAULT 0,
  overtime_hours NUMERIC(10,2) DEFAULT 0,
  overtime_pay NUMERIC(12,2) DEFAULT 0,
  bonus_amount NUMERIC(12,2) DEFAULT 0,
  deductions_amount NUMERIC(12,2) DEFAULT 0,
  gross_pay NUMERIC(12,2) DEFAULT 0,
  net_pay NUMERIC(12,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_date DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, payroll_period_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_records_tenant ON payroll_records(tenant_id);
ALTER TABLE IF EXISTS payroll_records
  ADD CONSTRAINT payroll_records_period_fk
  FOREIGN KEY (tenant_id, payroll_period_id) REFERENCES payroll_periods(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT payroll_records_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS payroll_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  employee_id VARCHAR(64),
  employee_email VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  bonus_type VARCHAR(50) DEFAULT 'performance',
  applied_by VARCHAR(50),
  applied_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  employee_id VARCHAR(64),
  employee_email VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL,
  reason TEXT NOT NULL,
  deduction_type VARCHAR(50) DEFAULT 'general',
  applied_by VARCHAR(50),
  applied_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id VARCHAR(64) NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL,
  salary_currency VARCHAR(3) DEFAULT 'PKR',
  effective_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================
-- Roles & Auditing
-- =================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(64) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  dashboard_access JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
ALTER TABLE IF EXISTS roles
  ADD CONSTRAINT roles_tenant_id_id_unique UNIQUE (tenant_id, id);

CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_email VARCHAR(255),
  old_role VARCHAR(64),
  new_role VARCHAR(64) NOT NULL,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS role_assignments
  ADD CONSTRAINT role_assignments_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT role_assignments_assigned_by_fk
  FOREIGN KEY (tenant_id, assigned_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
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

-- =================
-- Notifications
-- =================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
ALTER TABLE IF EXISTS notifications
  ADD CONSTRAINT notifications_user_fk
  FOREIGN KEY (tenant_id, user_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =================
-- Verifications
-- =================
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  verification_type VARCHAR(50) NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(30) DEFAULT 'success',
  image_data_length INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  shift_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  verification_type VARCHAR(20) NOT NULL,
  verification_image TEXT,
  location_data JSONB,
  device_info JSONB,
  verification_status VARCHAR(20) DEFAULT 'verified',
  verified_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS shift_verifications
  ADD CONSTRAINT shift_verifications_shift_fk
  FOREIGN KEY (tenant_id, shift_id) REFERENCES shift_assignments(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT shift_verifications_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS time_entry_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  time_entry_id UUID NOT NULL REFERENCES shift_logs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decision_notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS time_entry_approvals
  ADD CONSTRAINT time_entry_approvals_time_entry_fk
  FOREIGN KEY (tenant_id, time_entry_id) REFERENCES shift_logs(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT time_entry_approvals_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT time_entry_approvals_approver_fk
  FOREIGN KEY (tenant_id, approver_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =================
-- Onboarding
-- =================
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  position TEXT,
  total_estimated_time INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS onboarding_templates
  ADD CONSTRAINT onboarding_templates_tenant_id_id_unique UNIQUE (tenant_id, id);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  estimated_time INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS onboarding_steps
  ADD CONSTRAINT onboarding_steps_template_fk
  FOREIGN KEY (tenant_id, template_id) REFERENCES onboarding_templates(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS onboarding_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'in-progress',
  start_date DATE DEFAULT CURRENT_DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  assigned_mentor UUID REFERENCES employees(id) ON DELETE SET NULL,
  notes TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS onboarding_processes
  ADD CONSTRAINT onboarding_processes_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT onboarding_processes_template_fk
  FOREIGN KEY (tenant_id, template_id) REFERENCES onboarding_templates(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT onboarding_processes_mentor_fk
  FOREIGN KEY (tenant_id, assigned_mentor) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  process_id UUID NOT NULL REFERENCES onboarding_processes(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS step_completions
  ADD CONSTRAINT step_completions_process_fk
  FOREIGN KEY (tenant_id, process_id) REFERENCES onboarding_processes(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT step_completions_step_fk
  FOREIGN KEY (tenant_id, step_id) REFERENCES onboarding_steps(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT step_completions_completed_by_fk
  FOREIGN KEY (tenant_id, completed_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_url TEXT,
  required BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS onboarding_documents
  ADD CONSTRAINT onboarding_documents_uploaded_by_fk
  FOREIGN KEY (tenant_id, uploaded_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS onboarding_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  process_id UUID NOT NULL REFERENCES onboarding_processes(id) ON DELETE CASCADE,
  step_id UUID REFERENCES onboarding_steps(id) ON DELETE SET NULL,
  rating INTEGER,
  feedback_text TEXT,
  feedback_type VARCHAR(20) DEFAULT 'overall',
  submitted_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS onboarding_feedback
  ADD CONSTRAINT onboarding_feedback_process_fk
  FOREIGN KEY (tenant_id, process_id) REFERENCES onboarding_processes(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT onboarding_feedback_step_fk
  FOREIGN KEY (tenant_id, step_id) REFERENCES onboarding_steps(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT onboarding_feedback_submitted_by_fk
  FOREIGN KEY (tenant_id, submitted_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =====================
-- Training Assignments
-- =====================
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  training_type VARCHAR(80) NOT NULL,
  training_title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS training_assignments
  ADD CONSTRAINT training_assignments_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT training_assignments_assigned_by_fk
  FOREIGN KEY (tenant_id, assigned_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =========================
-- Team Requests & Reports
-- =========================
CREATE TABLE IF NOT EXISTS team_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('dock','bonus')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  effective_date DATE NOT NULL,
  additional_notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS team_requests
  ADD CONSTRAINT team_requests_team_lead_fk
  FOREIGN KEY (tenant_id, team_lead_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_requests_team_fk
  FOREIGN KEY (tenant_id, team_id) REFERENCES teams(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_requests_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_requests_reviewed_by_fk
  FOREIGN KEY (tenant_id, reviewed_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS team_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  summary TEXT NOT NULL,
  highlights JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  statistics JSONB NOT NULL,
  meeting_notes JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','reviewed','approved','rejected')),
  pm_notes TEXT,
  pm_reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  pm_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS team_reports
  ADD CONSTRAINT team_reports_team_lead_fk
  FOREIGN KEY (tenant_id, team_lead_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_reports_team_fk
  FOREIGN KEY (tenant_id, team_id) REFERENCES teams(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT team_reports_pm_reviewed_by_fk
  FOREIGN KEY (tenant_id, pm_reviewed_by) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- ===========================
-- Performance & Quality
-- ===========================
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  calls_handled INTEGER DEFAULT 0,
  avg_handle_time INTEGER DEFAULT 0,
  customer_satisfaction NUMERIC(3,2) CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 5),
  first_call_resolution_rate NUMERIC(5,2) CHECK (first_call_resolution_rate >= 0 AND first_call_resolution_rate <= 100),
  total_break_time INTEGER DEFAULT 0,
  total_work_time INTEGER DEFAULT 0,
  productivity_score NUMERIC(5,2),
  quality_score NUMERIC(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, date)
);
ALTER TABLE IF EXISTS performance_metrics
  ADD CONSTRAINT performance_metrics_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

CREATE TABLE IF NOT EXISTS quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  call_id VARCHAR(120),
  evaluation_date DATE DEFAULT CURRENT_DATE,
  score NUMERIC(5,2),
  communication_score NUMERIC(5,2),
  problem_solving_score NUMERIC(5,2),
  customer_service_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  feedback TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS quality_scores
  ADD CONSTRAINT quality_scores_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE,
  ADD CONSTRAINT quality_scores_evaluator_fk
  FOREIGN KEY (tenant_id, evaluator_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =====================
-- Availability
-- =====================
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(80) NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS employee_availability
  ADD CONSTRAINT employee_availability_employee_fk
  FOREIGN KEY (tenant_id, employee_id) REFERENCES employees(tenant_id, id) DEFERRABLE INITIALLY IMMEDIATE;

-- =====================
-- Compatibility Views
-- =====================
-- Legacy view used by some routes; maps employees -> employees_new with employee_code alias
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'employees_new'
  ) THEN
    CREATE VIEW employees_new AS
      SELECT 
        id,
        employee_code AS employee_id,
        first_name,
        last_name,
        email,
        department,
        job_position AS position,
        team_id,
        role,
        is_active,
        tenant_id,
        organization_id,
        created_at,
        updated_at
      FROM employees;
  END IF;
END $$;

-- Legacy view: map shift_templates to shifts for older queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'shifts'
  ) THEN
    CREATE VIEW shifts AS
      SELECT 
        id,
        tenant_id,
        organization_id,
        name,
        description,
        start_time,
        end_time,
        department,
        required_staff,
        hourly_rate,
        color,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM shift_templates;
  END IF;
END $$;

-- =====================
-- Helpful Indexes
-- =====================
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_status ON shift_swaps(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(tenant_id, status);


