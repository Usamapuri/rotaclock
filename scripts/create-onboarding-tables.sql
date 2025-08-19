-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create onboarding_templates table
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    total_estimated_time INTEGER DEFAULT 0, -- in minutes
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES employees(id)
);

-- Create onboarding_steps table
CREATE TABLE IF NOT EXISTS onboarding_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('documentation', 'training', 'setup', 'orientation')) NOT NULL,
    required BOOLEAN DEFAULT true,
    estimated_time INTEGER DEFAULT 0, -- in minutes
    step_order INTEGER NOT NULL,
    assigned_to VARCHAR(255),
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, step_order)
);

-- Create step_dependencies table
CREATE TABLE IF NOT EXISTS step_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    depends_on_step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(step_id, depends_on_step_id)
);

-- Create onboarding_documents table
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('handbook', 'policy', 'form', 'training', 'certificate')) NOT NULL,
    file_url TEXT,
    required BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create step_documents junction table
CREATE TABLE IF NOT EXISTS step_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES onboarding_documents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(step_id, document_id)
);

-- Create onboarding_processes table
CREATE TABLE IF NOT EXISTS onboarding_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    employee_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES onboarding_templates(id),
    template_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    expected_completion_date DATE NOT NULL,
    actual_completion_date DATE,
    status VARCHAR(50) CHECK (status IN ('not-started', 'in-progress', 'completed', 'overdue')) DEFAULT 'not-started',
    assigned_mentor VARCHAR(255),
    notes TEXT,
    progress DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create step_completions table
CREATE TABLE IF NOT EXISTS step_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES onboarding_processes(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback TEXT,
    completed_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(process_id, step_id)
);

-- Create onboarding_feedback table
CREATE TABLE IF NOT EXISTS onboarding_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES onboarding_processes(id) ON DELETE CASCADE,
    step_id UUID REFERENCES onboarding_steps(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    feedback_type VARCHAR(50) CHECK (feedback_type IN ('step', 'overall')) NOT NULL,
    submitted_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

CREATE INDEX IF NOT EXISTS idx_onboarding_templates_department ON onboarding_templates(department);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_is_active ON onboarding_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_template_id ON onboarding_steps(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_step_order ON onboarding_steps(template_id, step_order);

CREATE INDEX IF NOT EXISTS idx_onboarding_processes_employee_id ON onboarding_processes(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_template_id ON onboarding_processes(template_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_status ON onboarding_processes(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_processes_start_date ON onboarding_processes(start_date);

CREATE INDEX IF NOT EXISTS idx_step_completions_process_id ON step_completions(process_id);
CREATE INDEX IF NOT EXISTS idx_step_completions_step_id ON step_completions(step_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_feedback_process_id ON onboarding_feedback(process_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_feedback_step_id ON onboarding_feedback(step_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_templates_updated_at BEFORE UPDATE ON onboarding_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_steps_updated_at BEFORE UPDATE ON onboarding_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_documents_updated_at BEFORE UPDATE ON onboarding_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_processes_updated_at BEFORE UPDATE ON onboarding_processes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Employees can read their own data and admins can read all
CREATE POLICY "Users can view own employee data" ON employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all employee data" ON employees FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Templates are readable by all authenticated users
CREATE POLICY "Authenticated users can view templates" ON onboarding_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage templates" ON onboarding_templates FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Steps are readable by all authenticated users
CREATE POLICY "Authenticated users can view steps" ON onboarding_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage steps" ON onboarding_steps FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Documents are readable by all authenticated users
CREATE POLICY "Authenticated users can view documents" ON onboarding_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage documents" ON onboarding_documents FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Processes - employees can view their own, admins can view all
CREATE POLICY "Users can view own processes" ON onboarding_processes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.id = employee_id
    )
);
CREATE POLICY "Admins can view all processes" ON onboarding_processes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);
CREATE POLICY "Admins can manage processes" ON onboarding_processes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Step completions - employees can manage their own, admins can manage all
CREATE POLICY "Users can manage own completions" ON step_completions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employees e 
        JOIN onboarding_processes p ON p.employee_id = e.id
        WHERE e.user_id = auth.uid() 
        AND p.id = process_id
    )
);
CREATE POLICY "Admins can manage all completions" ON step_completions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);

-- Feedback - employees can manage their own, admins can view all
CREATE POLICY "Users can manage own feedback" ON onboarding_feedback FOR ALL USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.id = submitted_by
    )
);
CREATE POLICY "Admins can view all feedback" ON onboarding_feedback FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM employees e 
        WHERE e.user_id = auth.uid() 
        AND e.position ILIKE '%admin%'
    )
);
