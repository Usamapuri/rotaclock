-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    manager_id UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(8,2),
    max_hours_per_week INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    department VARCHAR(100),
    required_staff INTEGER DEFAULT 1,
    hourly_rate DECIMAL(8,2),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_assignments table
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    status VARCHAR(50) CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled', 'swap-requested')) DEFAULT 'assigned',
    assigned_by UUID REFERENCES employees(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, shift_id, date)
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_start TIMESTAMP WITH TIME ZONE,
    break_end TIMESTAMP WITH TIME ZONE,
    total_hours DECIMAL(5,2),
    status VARCHAR(50) CHECK (status IN ('in-progress', 'completed', 'break', 'overtime')) DEFAULT 'in-progress',
    notes TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shift_swaps table
CREATE TABLE IF NOT EXISTS shift_swaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES employees(id),
    target_id UUID NOT NULL REFERENCES employees(id),
    original_shift_id UUID NOT NULL REFERENCES shift_assignments(id),
    requested_shift_id UUID NOT NULL REFERENCES shift_assignments(id),
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
    reason TEXT,
    admin_notes TEXT,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('vacation', 'sick', 'personal', 'bereavement', 'jury-duty', 'other')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('info', 'success', 'warning', 'error', 'schedule', 'time', 'leave', 'swap')) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_holidays table
CREATE TABLE IF NOT EXISTS company_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50) CHECK (type IN ('holiday', 'company-event', 'maintenance')) DEFAULT 'holiday',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_shifts_department ON shifts(department);
CREATE INDEX IF NOT EXISTS idx_shifts_is_active ON shifts(is_active);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_employee_date ON shift_assignments(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_status ON shift_assignments(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requester ON shift_swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_target ON shift_swaps(target_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_status ON shift_swaps(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON company_holidays(date);

-- Insert sample data

-- Sample employees
INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hire_date, hourly_rate, max_hours_per_week) VALUES
('EMP001', 'John', 'Doe', 'john.doe@company.com', 'Sales', 'Sales Representative', '2023-01-15', 18.50, 40),
('EMP002', 'Jane', 'Smith', 'jane.smith@company.com', 'Support', 'Customer Support Specialist', '2023-02-01', 17.00, 40),
('EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', 'Engineering', 'Software Developer', '2023-01-10', 25.00, 40),
('EMP004', 'Sarah', 'Wilson', 'sarah.wilson@company.com', 'Marketing', 'Marketing Coordinator', '2023-03-01', 19.00, 40),
('EMP005', 'David', 'Brown', 'david.brown@company.com', 'Operations', 'Operations Manager', '2023-01-05', 22.00, 40),
('EMP006', 'Lisa', 'Davis', 'lisa.davis@company.com', 'Sales', 'Sales Manager', '2023-01-20', 24.00, 40),
('EMP007', 'Tom', 'Miller', 'tom.miller@company.com', 'Support', 'Support Team Lead', '2023-02-15', 20.00, 40),
('EMP008', 'Emily', 'Garcia', 'emily.garcia@company.com', 'Engineering', 'QA Engineer', '2023-03-15', 23.00, 40);

-- Sample shifts
INSERT INTO shifts (name, description, start_time, end_time, department, required_staff, hourly_rate, color) VALUES
('Morning Shift', 'Early morning shift for customer support', '08:00:00', '16:00:00', 'Support', 2, 17.00, '#3B82F6'),
('Evening Shift', 'Evening shift for sales team', '14:00:00', '22:00:00', 'Sales', 2, 18.50, '#10B981'),
('Night Shift', 'Overnight support shift', '22:00:00', '06:00:00', 'Support', 1, 19.00, '#6366F1'),
('Day Shift', 'Standard day shift', '09:00:00', '17:00:00', 'Engineering', 3, 25.00, '#F59E0B'),
('Late Shift', 'Late afternoon shift', '16:00:00', '00:00:00', 'Sales', 1, 18.50, '#EF4444');

-- Sample shift assignments for today
INSERT INTO shift_assignments (employee_id, shift_id, date, status) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), (SELECT id FROM shifts WHERE name = 'Evening Shift'), CURRENT_DATE, 'assigned'),
((SELECT id FROM employees WHERE employee_id = 'EMP002'), (SELECT id FROM shifts WHERE name = 'Morning Shift'), CURRENT_DATE, 'assigned'),
((SELECT id FROM employees WHERE employee_id = 'EMP003'), (SELECT id FROM shifts WHERE name = 'Day Shift'), CURRENT_DATE, 'assigned'),
((SELECT id FROM employees WHERE employee_id = 'EMP004'), (SELECT id FROM shifts WHERE name = 'Day Shift'), CURRENT_DATE, 'assigned'),
((SELECT id FROM employees WHERE employee_id = 'EMP005'), (SELECT id FROM shifts WHERE name = 'Day Shift'), CURRENT_DATE, 'assigned');

-- Sample time entries (some employees clocked in)
INSERT INTO time_entries (employee_id, clock_in, status) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP002'), NOW() - INTERVAL '2 hours', 'in-progress'),
((SELECT id FROM employees WHERE employee_id = 'EMP003'), NOW() - INTERVAL '1 hour', 'in-progress'),
((SELECT id FROM employees WHERE employee_id = 'EMP004'), NOW() - INTERVAL '30 minutes', 'in-progress');

-- Sample completed time entries from yesterday
INSERT INTO time_entries (employee_id, clock_in, clock_out, total_hours, status) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day', 8.0, 'completed'),
((SELECT id FROM employees WHERE employee_id = 'EMP002'), NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day', 8.0, 'completed'),
((SELECT id FROM employees WHERE employee_id = 'EMP003'), NOW() - INTERVAL '1 day' - INTERVAL '8 hours', NOW() - INTERVAL '1 day', 8.0, 'completed');

-- Sample shift swap requests
INSERT INTO shift_swaps (requester_id, target_id, original_shift_id, requested_shift_id, reason) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), (SELECT id FROM employees WHERE employee_id = 'EMP002'), 
 (SELECT id FROM shift_assignments WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'EMP001') LIMIT 1),
 (SELECT id FROM shift_assignments WHERE employee_id = (SELECT id FROM employees WHERE employee_id = 'EMP002') LIMIT 1),
 'Need to attend a family event');

-- Sample leave requests
INSERT INTO leave_requests (employee_id, type, start_date, end_date, days_requested, reason) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP004'), 'vacation', CURRENT_DATE + INTERVAL '1 week', CURRENT_DATE + INTERVAL '1 week' + INTERVAL '5 days', 5, 'Summer vacation'),
((SELECT id FROM employees WHERE employee_id = 'EMP005'), 'sick', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2, 'Not feeling well');

-- Sample notifications
INSERT INTO notifications (user_id, title, message, type) VALUES
('demo-user', 'Welcome to RotaCloud', 'Your account has been set up successfully', 'info'),
('demo-user', 'Shift Reminder', 'You have a shift starting in 30 minutes', 'schedule'),
('demo-user', 'Clock In Successful', 'You have successfully clocked in', 'success');

-- Sample company holidays
INSERT INTO company_holidays (name, date, type, description) VALUES
('New Year''s Day', '2024-01-01', 'holiday', 'New Year''s Day'),
('Independence Day', '2024-07-04', 'holiday', 'Independence Day'),
('Christmas Day', '2024-12-25', 'holiday', 'Christmas Day'),
('Company Retreat', '2024-06-15', 'company-event', 'Annual company retreat');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_assignments_updated_at BEFORE UPDATE ON shift_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_swaps_updated_at BEFORE UPDATE ON shift_swaps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_holidays_updated_at BEFORE UPDATE ON company_holidays FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
