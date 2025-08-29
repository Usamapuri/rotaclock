-- Team Lead feature: core schema (teams, team_assignments, employee role/team_id)
-- Updated for employees_new table
-- Safe to run multiple times (IF NOT EXISTS guards)

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  team_lead_id UUID REFERENCES employees_new(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);

-- Team assignments table (historical membership)
CREATE TABLE IF NOT EXISTS team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees_new(id) ON DELETE CASCADE,
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

-- Manager teams mapping table
CREATE TABLE IF NOT EXISTS manager_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES employees_new(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_teams_manager_id ON manager_teams(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_teams_team_id ON manager_teams(team_id);

-- Add team_id column to employees_new if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees_new' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE employees_new ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_employees_new_team_id ON employees_new(team_id);
  END IF;
END$$;

