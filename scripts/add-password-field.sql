-- Add password field to employees table
-- This migration adds a password field for employee authentication

-- Add password column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index for password field
CREATE INDEX IF NOT EXISTS idx_employees_password_hash ON employees(password_hash);

-- Add comment to document the field
COMMENT ON COLUMN employees.password_hash IS 'Hashed password for employee authentication';
