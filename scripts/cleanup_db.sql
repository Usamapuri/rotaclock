-- WARNING: This script DROPS legacy tables/views and re-creates lean indexes.
-- Run only if you are OK losing existing demo data.

BEGIN;

-- 1) Drop legacy tables if they exist
DROP TABLE IF EXISTS shift_assignments CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS team_assignments CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;

-- 2) Ensure new tables exist (minimal schema)
-- employees_new
CREATE TABLE IF NOT EXISTS employees_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT,
  job_position TEXT,
  role TEXT DEFAULT 'employee',
  team_id UUID,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  max_hours_per_week INT DEFAULT 40,
  is_active BOOLEAN DEFAULT TRUE,
  is_online BOOLEAN DEFAULT FALSE,
  last_online TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shift_templates
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  department TEXT,
  required_staff INT DEFAULT 1,
  hourly_rate NUMERIC(10,2),
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shift_assignments_new
CREATE TABLE IF NOT EXISTS shift_assignments_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees_new(id) ON DELETE CASCADE,
  template_id UUID REFERENCES shift_templates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- Optional per-assignment overrides so we don't need to create templates for every custom shift
  override_name TEXT,
  override_start_time TIME,
  override_end_time TIME,
  override_color TEXT,
  status TEXT DEFAULT 'assigned',
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- shift_logs (time tracking)
CREATE TABLE IF NOT EXISTS shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees_new(id) ON DELETE CASCADE,
  shift_assignment_id UUID REFERENCES shift_assignments_new(id) ON DELETE SET NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  total_shift_hours NUMERIC(5,2),
  break_time_used NUMERIC(5,2) DEFAULT 0,
  max_break_allowed NUMERIC(5,2) DEFAULT 1.0,
  is_late BOOLEAN DEFAULT FALSE,
  is_no_show BOOLEAN DEFAULT FALSE,
  late_minutes INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Core indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_new_email ON employees_new(email);
CREATE INDEX IF NOT EXISTS idx_assignments_employee_date ON shift_assignments_new(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON shift_assignments_new(date);
CREATE INDEX IF NOT EXISTS idx_shift_logs_employee ON shift_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_clockin ON shift_logs(clock_in_time);

COMMIT;


