-- Team Lead feature: core schema (teams, team_assignments, employee role/team_id)
-- Safe to run multiple times (IF NOT EXISTS guards)

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees: role and team reference
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin','team_lead','employee')),
  ADD COLUMN IF NOT EXISTS team_id UUID;

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  team_lead_id UUID REFERENCES employees(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);

-- Employees -> Teams FK (defer until teams exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_employees_team_id'
      AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT fk_employees_team_id FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Team assignments table (historical membership)
CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, team_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_team_assignments_employee_id ON team_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_team_id ON team_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_is_active ON team_assignments(is_active);

-- Optional data backfill: infer roles from position text (best-effort)
UPDATE employees SET role = 'admin' 
WHERE role IS DISTINCT FROM 'admin' AND (
  position ILIKE '%admin%' OR position ILIKE '%manager%'
);

UPDATE employees SET role = 'team_lead' 
WHERE role IS DISTINCT FROM 'team_lead' AND (
  position ILIKE '%lead%' OR position ILIKE '%supervisor%'
);


