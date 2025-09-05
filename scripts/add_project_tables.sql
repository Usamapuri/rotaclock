-- Projects and Project Management Tables

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT CHECK (status IN ('planning', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'planning',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    manager_id UUID REFERENCES employees(id),
    budget DECIMAL(12,2),
    actual_cost DECIMAL(12,2) DEFAULT 0,
    progress INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Project Teams table
CREATE TABLE IF NOT EXISTS project_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, team_id)
);

-- Project Members table (for individual assignments)
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('lead', 'member', 'observer')) DEFAULT 'member',
    assigned_date DATE DEFAULT CURRENT_DATE,
    hours_allocated INTEGER DEFAULT 40,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, project_id, employee_id)
);

-- Project Tasks table
CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'completed', 'blocked')) DEFAULT 'todo',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to UUID REFERENCES employees(id),
    start_date DATE,
    due_date DATE,
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    parent_task_id UUID REFERENCES project_tasks(id),
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Time Entries table
CREATE TABLE IF NOT EXISTS project_time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES project_tasks(id),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_worked DECIMAL(4,2) NOT NULL,
    description TEXT,
    billable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Documents table
CREATE TABLE IF NOT EXISTS project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('contract', 'specification', 'report', 'design', 'other')) DEFAULT 'other',
    file_url TEXT,
    version TEXT,
    uploaded_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_manager ON projects(tenant_id, manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_dates ON projects(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_project_teams_tenant ON project_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_project ON project_teams(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_teams_team ON project_teams(tenant_id, team_id);

CREATE INDEX IF NOT EXISTS idx_project_members_tenant ON project_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_employee ON project_members(tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS idx_project_tasks_tenant ON project_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned ON project_tasks(tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_dates ON project_tasks(tenant_id, start_date, due_date);

CREATE INDEX IF NOT EXISTS idx_project_time_tenant ON project_time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_time_project ON project_time_entries(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_time_employee ON project_time_entries(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_project_time_date ON project_time_entries(tenant_id, date);

CREATE INDEX IF NOT EXISTS idx_project_docs_tenant ON project_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_project ON project_documents(tenant_id, project_id);

-- Add sample projects for LogiCode Services
INSERT INTO projects (
    tenant_id,
    name,
    description,
    start_date,
    end_date,
    status,
    priority,
    manager_id,
    budget,
    is_active
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Customer Support Portal',
    'Develop a new customer support portal with ticket management and live chat',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '3 months',
    'active',
    'high',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    50000.00,
    true
);

-- Add sample project members
INSERT INTO project_members (
    tenant_id,
    project_id,
    employee_id,
    role,
    hours_allocated
) 
SELECT 
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    p.id,
    e.id,
    CASE 
        WHEN e.role = 'admin' THEN 'lead'
        ELSE 'member'
    END,
    40
FROM projects p
CROSS JOIN employees e
WHERE p.name = 'Customer Support Portal'
AND e.tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
