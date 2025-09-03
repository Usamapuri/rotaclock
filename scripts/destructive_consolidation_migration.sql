-- Destructive Database Consolidation Migration
-- Purpose: Remove legacy/duplicate tables, promote canonical schema, enforce multi-tenancy and performance
-- Notes: This will DROP legacy tables and constraints. Ensure you have a fresh backup/snapshot.

-- Recommended session settings
SET lock_timeout = '10s';
SET statement_timeout = '5min';

BEGIN;

-- Ensure extensions for UUID helpers exist (both forms used across scripts)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Drop compatibility views if any exist (we do not keep bridging views)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'employees_new'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS employees_new CASCADE';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'shift_assignments_new'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS shift_assignments_new CASCADE';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'time_entries_new'
  ) THEN
    EXECUTE 'DROP VIEW IF EXISTS time_entries_new CASCADE';
  END IF;
END $$;

-- 2) Drop legacy/duplicate tables (safe to ignore if not present)
--    We remove split logs in favor of unified time_entries
DROP TABLE IF EXISTS shift_logs CASCADE;
DROP TABLE IF EXISTS break_logs CASCADE;

--    Replace shifts with shift_templates
DROP TABLE IF EXISTS shifts CASCADE;

--    Remove legacy canonical tables that will be replaced by promoted ones
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS shift_assignments CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

--    Drop obvious leftovers
DROP TABLE IF EXISTS employees_legacy CASCADE;
DROP TABLE IF EXISTS shift_assignments_legacy CASCADE;
DROP TABLE IF EXISTS time_entries_legacy CASCADE;
DROP TABLE IF EXISTS teams_new CASCADE;

-- 3) Promote current active tables to canonical names (no `_new`)
--    These may not exist depending on environment; operations are conditional
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees_new') THEN
    EXECUTE 'ALTER TABLE employees_new RENAME TO employees';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_assignments_new') THEN
    EXECUTE 'ALTER TABLE shift_assignments_new RENAME TO shift_assignments';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries_new') THEN
    EXECUTE 'ALTER TABLE time_entries_new RENAME TO time_entries';
  END IF;
END $$;

-- 4) Ensure canonical core tables exist (idempotent)
--    Create minimal shells if missing; app migrations may add more columns later
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  lead_id UUID,
  manager_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  template_id UUID NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'assigned',
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  assignment_id UUID,
  date DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  total_hours NUMERIC(5,2),
  break_hours NUMERIC(3,2) DEFAULT 0,
  status TEXT DEFAULT 'in-progress',
  location_lat NUMERIC(10,8),
  location_lng NUMERIC(11,8),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Multi-tenancy: add tenant_id to all core tables and enforce NOT NULL
--    We set a generated UUID per row as a placeholder to guarantee NOT NULL; application must populate correctly on writes.
--    If your environment already has tenant_id populated, these updates will be no-ops.

-- helper: add column with default, backfill, then set NOT NULL
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE employees ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE employees SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE employees ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE teams ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE teams SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE teams ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_assignments' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE team_assignments ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE team_assignments SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE team_assignments ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_templates' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE shift_templates ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE shift_templates SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE shift_templates ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_assignments' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE shift_assignments ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE shift_assignments SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE shift_assignments ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE time_entries ADD COLUMN tenant_id UUID DEFAULT gen_random_uuid()';
    EXECUTE 'UPDATE time_entries SET tenant_id = COALESCE(tenant_id, gen_random_uuid())';
    EXECUTE 'ALTER TABLE time_entries ALTER COLUMN tenant_id SET NOT NULL';
  END IF;
END $$;

-- 6) Constraints and indexes (idempotent)
-- Employees
CREATE UNIQUE INDEX IF NOT EXISTS ux_employees_tenant_code ON employees(tenant_id, employee_code);
CREATE INDEX IF NOT EXISTS ix_employees_tenant_email ON employees(tenant_id, email);
CREATE INDEX IF NOT EXISTS ix_employees_tenant_dept ON employees(tenant_id, department);
CREATE INDEX IF NOT EXISTS ix_employees_tenant_role ON employees(tenant_id, role);
CREATE INDEX IF NOT EXISTS ix_employees_tenant_team ON employees(tenant_id, team_id);

-- Teams and assignments
CREATE INDEX IF NOT EXISTS ix_teams_tenant_dept ON teams(tenant_id, department);
CREATE INDEX IF NOT EXISTS ix_team_assignments_team ON team_assignments(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS ix_team_assignments_emp ON team_assignments(tenant_id, employee_id);

-- Shift templates and assignments
CREATE INDEX IF NOT EXISTS ix_shift_templates_tenant_active ON shift_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS ix_shift_templates_tenant_dept ON shift_templates(tenant_id, department);
CREATE UNIQUE INDEX IF NOT EXISTS ux_shift_assignments_tenant_emp_date ON shift_assignments(tenant_id, employee_id, date);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_tenant_date ON shift_assignments(tenant_id, date);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_tenant_template ON shift_assignments(tenant_id, template_id);
CREATE INDEX IF NOT EXISTS ix_shift_assignments_tenant_status ON shift_assignments(tenant_id, status);

-- Time entries
CREATE INDEX IF NOT EXISTS ix_time_entries_tenant_emp_date ON time_entries(tenant_id, employee_id, date);
CREATE INDEX IF NOT EXISTS ix_time_entries_tenant_assignment ON time_entries(tenant_id, assignment_id);
CREATE INDEX IF NOT EXISTS ix_time_entries_tenant_status ON time_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS ix_time_entries_tenant_clock_in ON time_entries(tenant_id, clock_in);

-- 7) Basic FK wiring (tenant-agnostic; adjust as needed in app migrations)
-- These may fail if column sets differ; wrap in blocks to remain idempotent.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_shift_assignments_employee_id'
  ) THEN
    EXECUTE 'ALTER TABLE shift_assignments
             ADD CONSTRAINT fk_shift_assignments_employee_id
             FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_shift_assignments_template_id'
  ) THEN
    EXECUTE 'ALTER TABLE shift_assignments
             ADD CONSTRAINT fk_shift_assignments_template_id
             FOREIGN KEY (template_id) REFERENCES shift_templates(id) ON DELETE CASCADE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_time_entries_employee_id'
  ) THEN
    EXECUTE 'ALTER TABLE time_entries
             ADD CONSTRAINT fk_time_entries_employee_id
             FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE';
  END IF;
END $$;

-- 8) Final consistency checks
-- Only canonical tables should remain; no `_new`, `_legacy`, or splits.
-- (Run manually if desired)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;

COMMIT;

-- End of destructive migration


