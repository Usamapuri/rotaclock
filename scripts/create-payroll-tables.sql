-- Payroll System Database Schema
-- This script creates all necessary tables for the payroll system

-- 1. Employee Salaries Table
CREATE TABLE IF NOT EXISTS employee_salaries (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    base_salary DECIMAL(10,2) NOT NULL DEFAULT 20000.00, -- PKR 20,000 default
    hourly_rate DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'PKR',
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Payroll Periods Table
CREATE TABLE IF NOT EXISTS payroll_periods (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, processing, closed, paid
    total_employees INTEGER DEFAULT 0,
    total_payroll_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    payroll_period_id INTEGER,
    base_salary DECIMAL(10,2) NOT NULL,
    hours_worked DECIMAL(8,2) DEFAULT 0.00,
    hourly_pay DECIMAL(10,2) DEFAULT 0.00,
    overtime_hours DECIMAL(8,2) DEFAULT 0.00,
    overtime_pay DECIMAL(10,2) DEFAULT 0.00,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    deductions_amount DECIMAL(10,2) DEFAULT 0.00,
    gross_pay DECIMAL(10,2) DEFAULT 0.00,
    net_pay DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payroll Deductions Table
CREATE TABLE IF NOT EXISTS payroll_deductions (
    id SERIAL PRIMARY KEY,
    payroll_record_id INTEGER,
    employee_id VARCHAR(50) NOT NULL,
    deduction_type VARCHAR(50) NOT NULL, -- performance, attendance, other
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    applied_by VARCHAR(50), -- admin who applied the deduction
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payroll Bonuses Table
CREATE TABLE IF NOT EXISTS payroll_bonuses (
    id SERIAL PRIMARY KEY,
    payroll_record_id INTEGER,
    employee_id VARCHAR(50) NOT NULL,
    bonus_type VARCHAR(50) NOT NULL, -- performance, attendance, special
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    applied_by VARCHAR(50), -- admin who applied the bonus
    applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Payroll Settings Table
CREATE TABLE IF NOT EXISTS payroll_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period_id ON payroll_records(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_payment_status ON payroll_records(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_deductions_employee_id ON payroll_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_employee_id ON payroll_bonuses(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);

-- Insert default payroll settings
INSERT INTO payroll_settings (setting_key, setting_value, description) VALUES
('default_base_salary', '20000', 'Default base salary in PKR'),
('overtime_rate_multiplier', '1.5', 'Overtime pay multiplier'),
('max_regular_hours', '40', 'Maximum regular hours per week'),
('payroll_currency', 'PKR', 'Default currency for payroll'),
('tax_rate', '0.05', 'Default tax rate (5%)'),
('performance_bonus_threshold', '4.5', 'Performance rating threshold for bonus'),
('late_deduction_amount', '500', 'Deduction amount for late arrivals'),
('no_show_deduction_amount', '1000', 'Deduction amount for no-shows')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE employee_salaries IS 'Stores employee salary information including base salary and hourly rates';
COMMENT ON TABLE payroll_periods IS 'Defines payroll periods (weekly, bi-weekly, monthly)';
COMMENT ON TABLE payroll_records IS 'Main payroll records for each employee per period';
COMMENT ON TABLE payroll_deductions IS 'Tracks deductions applied to employee pay';
COMMENT ON TABLE payroll_bonuses IS 'Tracks bonuses applied to employee pay';
COMMENT ON TABLE payroll_settings IS 'System-wide payroll configuration settings';
