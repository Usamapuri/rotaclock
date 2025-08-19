-- Mock Data for ShiftTracker Application
-- This script populates the database with realistic sample data

-- Clear existing data (optional - uncomment if needed)
-- DELETE FROM time_entries;
-- DELETE FROM shift_assignments;
-- DELETE FROM shifts;
-- DELETE FROM employees;

-- Insert sample employees
INSERT INTO employees (employee_id, first_name, last_name, email, department, position, hire_date, hourly_rate, is_active) VALUES
('EMP001', 'John', 'Smith', 'john.smith@company.com', 'Sales', 'Senior Sales Rep', '2023-01-15', 25.00, true),
('EMP002', 'Sarah', 'Johnson', 'sarah.johnson@company.com', 'Marketing', 'Marketing Manager', '2023-02-01', 30.00, true),
('EMP003', 'Michael', 'Brown', 'michael.brown@company.com', 'Operations', 'Operations Specialist', '2023-01-20', 22.00, true),
('EMP004', 'Emily', 'Davis', 'emily.davis@company.com', 'Support', 'Customer Support Rep', '2023-03-10', 20.00, true),
('EMP005', 'David', 'Wilson', 'david.wilson@company.com', 'Sales', 'Sales Manager', '2022-11-15', 35.00, true),
('EMP006', 'Lisa', 'Anderson', 'lisa.anderson@company.com', 'Marketing', 'Content Creator', '2023-04-05', 24.00, true),
('EMP007', 'Robert', 'Taylor', 'robert.taylor@company.com', 'Operations', 'Warehouse Manager', '2022-09-20', 28.00, true),
('EMP008', 'Jennifer', 'Martinez', 'jennifer.martinez@company.com', 'Support', 'Support Team Lead', '2023-02-15', 26.00, true),
('EMP009', 'Christopher', 'Garcia', 'christopher.garcia@company.com', 'Sales', 'Sales Rep', '2023-05-01', 23.00, true),
('EMP010', 'Amanda', 'Rodriguez', 'amanda.rodriguez@company.com', 'Marketing', 'Social Media Specialist', '2023-06-10', 22.00, true);

-- Insert sample shifts
INSERT INTO shifts (name, description, start_time, end_time, department, required_staff, hourly_rate, color) VALUES
('Morning Shift', 'Early morning operations', '08:00:00', '16:00:00', 'Operations', 3, 22.00, '#3B82F6'),
('Sales Shift', 'Sales team coverage', '09:00:00', '17:00:00', 'Sales', 2, 25.00, '#10B981'),
('Support Shift', 'Customer support coverage', '10:00:00', '18:00:00', 'Support', 2, 20.00, '#F59E0B'),
('Marketing Shift', 'Marketing activities', '09:00:00', '17:00:00', 'Marketing', 1, 24.00, '#8B5CF6'),
('Evening Shift', 'Evening operations', '16:00:00', '00:00:00', 'Operations', 2, 24.00, '#EF4444'),
('Night Shift', 'Overnight operations', '00:00:00', '08:00:00', 'Operations', 1, 26.00, '#6B7280');

-- Get employee IDs for assignments
DO $$
DECLARE
    emp1 UUID; emp2 UUID; emp3 UUID; emp4 UUID; emp5 UUID;
    emp6 UUID; emp7 UUID; emp8 UUID; emp9 UUID; emp10 UUID;
    shift1 UUID; shift2 UUID; shift3 UUID; shift4 UUID; shift5 UUID; shift6 UUID;
    current_date DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    -- Get employee IDs
    SELECT id INTO emp1 FROM employees WHERE employee_id = 'EMP001';
    SELECT id INTO emp2 FROM employees WHERE employee_id = 'EMP002';
    SELECT id INTO emp3 FROM employees WHERE employee_id = 'EMP003';
    SELECT id INTO emp4 FROM employees WHERE employee_id = 'EMP004';
    SELECT id INTO emp5 FROM employees WHERE employee_id = 'EMP005';
    SELECT id INTO emp6 FROM employees WHERE employee_id = 'EMP006';
    SELECT id INTO emp7 FROM employees WHERE employee_id = 'EMP007';
    SELECT id INTO emp8 FROM employees WHERE employee_id = 'EMP008';
    SELECT id INTO emp9 FROM employees WHERE employee_id = 'EMP009';
    SELECT id INTO emp10 FROM employees WHERE employee_id = 'EMP010';
    
    -- Get shift IDs
    SELECT id INTO shift1 FROM shifts WHERE name = 'Morning Shift';
    SELECT id INTO shift2 FROM shifts WHERE name = 'Sales Shift';
    SELECT id INTO shift3 FROM shifts WHERE name = 'Support Shift';
    SELECT id INTO shift4 FROM shifts WHERE name = 'Marketing Shift';
    SELECT id INTO shift5 FROM shifts WHERE name = 'Evening Shift';
    SELECT id INTO shift6 FROM shifts WHERE name = 'Night Shift';
    
    -- Create shift assignments for the last 30 days
    FOR i IN 0..29 LOOP
        -- Day shift assignments
        INSERT INTO shift_assignments (employee_id, shift_id, date, status) VALUES
        (emp1, shift2, current_date - i, 'completed'),
        (emp5, shift2, current_date - i, 'completed'),
        (emp9, shift2, current_date - i, 'completed'),
        (emp2, shift4, current_date - i, 'completed'),
        (emp6, shift4, current_date - i, 'completed'),
        (emp10, shift4, current_date - i, 'completed'),
        (emp3, shift1, current_date - i, 'completed'),
        (emp7, shift1, current_date - i, 'completed'),
        (emp4, shift3, current_date - i, 'completed'),
        (emp8, shift3, current_date - i, 'completed');
        
        -- Evening shift assignments
        IF i < 20 THEN
            INSERT INTO shift_assignments (employee_id, shift_id, date, status) VALUES
            (emp3, shift5, current_date - i, 'completed'),
            (emp7, shift5, current_date - i, 'completed');
        END IF;
        
        -- Night shift assignments (every 3rd day)
        IF i % 3 = 0 THEN
            INSERT INTO shift_assignments (employee_id, shift_id, date, status) VALUES
            (emp3, shift6, current_date - i, 'completed');
        END IF;
    END LOOP;
END $$;

-- Insert time entries with realistic data
DO $$
DECLARE
    emp1 UUID; emp2 UUID; emp3 UUID; emp4 UUID; emp5 UUID;
    emp6 UUID; emp7 UUID; emp8 UUID; emp9 UUID; emp10 UUID;
    current_date DATE := CURRENT_DATE;
    i INTEGER;
    clock_in_time TIMESTAMP;
    clock_out_time TIMESTAMP;
    break_start_time TIMESTAMP;
    break_end_time TIMESTAMP;
    total_hours DECIMAL(5,2);
BEGIN
    -- Get employee IDs
    SELECT id INTO emp1 FROM employees WHERE employee_id = 'EMP001';
    SELECT id INTO emp2 FROM employees WHERE employee_id = 'EMP002';
    SELECT id INTO emp3 FROM employees WHERE employee_id = 'EMP003';
    SELECT id INTO emp4 FROM employees WHERE employee_id = 'EMP004';
    SELECT id INTO emp5 FROM employees WHERE employee_id = 'EMP005';
    SELECT id INTO emp6 FROM employees WHERE employee_id = 'EMP006';
    SELECT id INTO emp7 FROM employees WHERE employee_id = 'EMP007';
    SELECT id INTO emp8 FROM employees WHERE employee_id = 'EMP008';
    SELECT id INTO emp9 FROM employees WHERE employee_id = 'EMP009';
    SELECT id INTO emp10 FROM employees WHERE employee_id = 'EMP010';
    
    -- Create time entries for the last 30 days
    FOR i IN 0..29 LOOP
        -- Sales team (EMP001, EMP005, EMP009)
        -- Normal day: 8 hours, some overtime
        clock_in_time := (current_date - i)::timestamp + '09:00:00'::time + (random() * 15)::integer * interval '1 minute';
        break_start_time := clock_in_time + interval '4 hours' + (random() * 30)::integer * interval '1 minute';
        break_end_time := break_start_time + interval '30 minutes' + (random() * 15)::integer * interval '1 minute';
        clock_out_time := clock_in_time + interval '8 hours' + (random() * 60)::integer * interval '1 minute';
        total_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - (break_end_time - break_start_time))) / 3600;
        
        INSERT INTO time_entries (employee_id, clock_in, clock_out, break_start, break_end, total_hours, status) VALUES
        (emp1, clock_in_time, clock_out_time, break_start_time, break_end_time, total_hours, 'completed');
        
        -- Marketing team (EMP002, EMP006, EMP010)
        clock_in_time := (current_date - i)::timestamp + '09:00:00'::time + (random() * 20)::integer * interval '1 minute';
        break_start_time := clock_in_time + interval '4 hours' + (random() * 30)::integer * interval '1 minute';
        break_end_time := break_start_time + interval '30 minutes' + (random() * 15)::integer * interval '1 minute';
        clock_out_time := clock_in_time + interval '8 hours' + (random() * 30)::integer * interval '1 minute';
        total_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - (break_end_time - break_start_time))) / 3600;
        
        INSERT INTO time_entries (employee_id, clock_in, clock_out, break_start, break_end, total_hours, status) VALUES
        (emp2, clock_in_time, clock_out_time, break_start_time, break_end_time, total_hours, 'completed');
        
        -- Operations team (EMP003, EMP007)
        clock_in_time := (current_date - i)::timestamp + '08:00:00'::time + (random() * 10)::integer * interval '1 minute';
        break_start_time := clock_in_time + interval '4 hours' + (random() * 30)::integer * interval '1 minute';
        break_end_time := break_start_time + interval '30 minutes' + (random() * 15)::integer * interval '1 minute';
        clock_out_time := clock_in_time + interval '8 hours' + (random() * 45)::integer * interval '1 minute';
        total_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - (break_end_time - break_start_time))) / 3600;
        
        INSERT INTO time_entries (employee_id, clock_in, clock_out, break_start, break_end, total_hours, status) VALUES
        (emp3, clock_in_time, clock_out_time, break_start_time, break_end_time, total_hours, 'completed');
        
        -- Support team (EMP004, EMP008)
        clock_in_time := (current_date - i)::timestamp + '10:00:00'::time + (random() * 15)::integer * interval '1 minute';
        break_start_time := clock_in_time + interval '4 hours' + (random() * 30)::integer * interval '1 minute';
        break_end_time := break_start_time + interval '30 minutes' + (random() * 15)::integer * interval '1 minute';
        clock_out_time := clock_in_time + interval '8 hours' + (random() * 30)::integer * interval '1 minute';
        total_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - (break_end_time - break_start_time))) / 3600;
        
        INSERT INTO time_entries (employee_id, clock_in, clock_out, break_start, break_end, total_hours, status) VALUES
        (emp4, clock_in_time, clock_out_time, break_start_time, break_end_time, total_hours, 'completed');
        
        -- Add some overtime for managers
        IF i % 3 = 0 THEN
            clock_in_time := (current_date - i)::timestamp + '08:30:00'::time;
            clock_out_time := clock_in_time + interval '10 hours';
            total_hours := 10.0;
            
            INSERT INTO time_entries (employee_id, clock_in, clock_out, total_hours, status) VALUES
            (emp5, clock_in_time, clock_out_time, total_hours, 'completed');
        END IF;
        
        -- Add some late clock-ins
        IF i % 5 = 0 THEN
            clock_in_time := (current_date - i)::timestamp + '09:30:00'::time;
            clock_out_time := clock_in_time + interval '8 hours';
            total_hours := 8.0;
            
            INSERT INTO time_entries (employee_id, clock_in, clock_out, total_hours, status) VALUES
            (emp9, clock_in_time, clock_out_time, total_hours, 'completed');
        END IF;
    END LOOP;
END $$;

-- Insert some company holidays
INSERT INTO company_holidays (name, date, type, description) VALUES
('New Year''s Day', '2025-01-01', 'holiday', 'New Year celebration'),
('Memorial Day', '2025-05-26', 'holiday', 'Memorial Day holiday'),
('Independence Day', '2025-07-04', 'holiday', 'Independence Day celebration'),
('Labor Day', '2025-09-01', 'holiday', 'Labor Day holiday'),
('Thanksgiving', '2025-11-27', 'holiday', 'Thanksgiving Day'),
('Christmas Day', '2025-12-25', 'holiday', 'Christmas celebration');

-- Insert some notifications
INSERT INTO notifications (user_id, title, message, type) VALUES
('00000000-0000-0000-0000-000000000000', 'System Maintenance', 'Scheduled maintenance on Sunday 2-4 AM', 'info'),
('00000000-0000-0000-0000-000000000000', 'Holiday Notice', 'Office closed for New Year''s Day', 'info'),
('00000000-0000-0000-0000-000000000000', 'Overtime Available', 'Extra shifts available this weekend', 'schedule');

-- Update some employees with different scenarios
UPDATE employees SET 
    hourly_rate = 27.50,
    department = 'Sales'
WHERE employee_id = 'EMP003';

UPDATE employees SET 
    hourly_rate = 32.00,
    position = 'Senior Marketing Manager'
WHERE employee_id = 'EMP002';

-- Add some incomplete time entries (current day)
INSERT INTO time_entries (employee_id, clock_in, status) VALUES
((SELECT id FROM employees WHERE employee_id = 'EMP001'), NOW() - interval '2 hours', 'in-progress'),
((SELECT id FROM employees WHERE employee_id = 'EMP004'), NOW() - interval '1 hour', 'in-progress');

COMMIT;
