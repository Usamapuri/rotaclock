-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create manager_projects table
CREATE TABLE IF NOT EXISTS manager_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, employee_id)
);

-- Create team_assignments table
CREATE TABLE IF NOT EXISTS team_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, team_id, employee_id)
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
    productivity_score DECIMAL(3,2) CHECK (productivity_score >= 0 AND productivity_score <= 5),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    reviewed_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add team_id column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee';

-- Create indexes for tenant isolation and performance
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_project_id ON teams(project_id);
CREATE INDEX IF NOT EXISTS idx_manager_projects_tenant_id ON manager_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_manager_projects_project_id ON manager_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_manager_projects_employee_id ON manager_projects(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_tenant_id ON team_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_team_id ON team_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_employee_id ON team_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_id ON performance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee_id ON performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_tenant_active ON projects(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teams_tenant_dept ON teams(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_manager_projects_tenant_project ON manager_projects(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_tenant_team ON team_assignments(tenant_id, team_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_tenant_employee ON performance_metrics(tenant_id, employee_id);
