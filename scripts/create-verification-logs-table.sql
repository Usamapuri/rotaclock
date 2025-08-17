-- Create verification_logs table for storing verification records
CREATE TABLE IF NOT EXISTS verification_logs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    verification_type VARCHAR(50) NOT NULL DEFAULT 'shift_start',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'verified',
    image_data_length INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_verification_logs_employee_id ON verification_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_timestamp ON verification_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_verification_logs_type ON verification_logs(verification_type);

-- Add comment
COMMENT ON TABLE verification_logs IS 'Stores verification records for employee shift starts and other verification events';
