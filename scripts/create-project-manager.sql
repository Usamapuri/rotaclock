-- Project Manager feature: role + manager_teams mapping
-- Safe to run multiple times

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Expand employees.role to include project_manager
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find any check constraint on employees.role
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY (con.conkey) AND att.attrelid = con.conrelid
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'employees'
    AND att.attname = 'role'
    AND con.contype = 'c';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', constraint_name);
  END IF;

  -- Recreate with expanded allowed roles
  ALTER TABLE employees
    ALTER COLUMN role TYPE VARCHAR(20),
    ALTER COLUMN role SET DEFAULT 'employee',
    ADD CONSTRAINT employees_role_check CHECK (role IN ('admin','team_lead','project_manager','employee'));
END $$;

CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- 2) manager_teams mapping table
CREATE TABLE IF NOT EXISTS manager_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_teams_manager_id ON manager_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_team_id ON manager_teams(team_id);


