-- Create shift logs and attendance tracking tables

-- Shift logs table to track each shift session
CREATE TABLE IF NOT EXISTS shift_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out_time TIMESTAMP WITH TIME ZONE,
    total_shift_hours DECIMAL(5,2),
    break_time_used DECIMAL(5,2) DEFAULT 0,
    max_break_allowed DECIMAL(5,2) DEFAULT 1.0, -- 1 hour default
    is_late BOOLEAN DEFAULT FALSE,
    is_no_show BOOLEAN DEFAULT FALSE,
    late_minutes INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Break logs table to track individual breaks
CREATE TABLE IF NOT EXISTS break_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_log_id UUID NOT NULL REFERENCES shift_logs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    break_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    break_end_time TIMESTAMP WITH TIME ZONE,
    break_duration DECIMAL(5,2), -- in hours
    break_type VARCHAR(20) DEFAULT 'lunch', -- lunch, rest, other
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance summary table for reporting
CREATE TABLE IF NOT EXISTS attendance_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_shifts INTEGER DEFAULT 0,
    total_hours_worked DECIMAL(5,2) DEFAULT 0,
    total_break_time DECIMAL(5,2) DEFAULT 0,
    late_count INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    on_time_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_logs_employee_id ON shift_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_logs_date ON shift_logs(DATE(clock_in_time));
CREATE INDEX IF NOT EXISTS idx_break_logs_shift_log_id ON break_logs(shift_log_id);
CREATE INDEX IF NOT EXISTS idx_break_logs_employee_id ON break_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_summary_employee_date ON attendance_summary(employee_id, date);

-- Add comments for documentation
COMMENT ON TABLE shift_logs IS 'Tracks individual shift sessions with clock in/out times and attendance status';
COMMENT ON TABLE break_logs IS 'Tracks individual breaks taken during shifts';
COMMENT ON TABLE attendance_summary IS 'Daily summary of employee attendance for reporting';
