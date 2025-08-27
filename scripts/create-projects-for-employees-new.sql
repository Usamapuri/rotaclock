-- Projects core schema and manager-project mapping
-- Updated for employees_new table
-- Safe to run multiple times

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Add project_id to teams if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN project_id UUID;
  END IF;
END$$;

-- Add foreign key constraint for teams.project_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_teams_project_id'
      AND table_name = 'teams'
  ) THEN
    ALTER TABLE teams
      ADD CONSTRAINT fk_teams_project_id FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teams_project_id ON teams(project_id);

-- Manager to Projects mapping
CREATE TABLE IF NOT EXISTS manager_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID NOT NULL REFERENCES employees_new(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(manager_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_projects_manager_id ON manager_projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_projects_project_id ON manager_projects(project_id);
