-- Add password field to employees_new table
-- This migration adds a password field for employee authentication

BEGIN;

-- Add password column to employees_new table
ALTER TABLE employees_new ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index for password field
CREATE INDEX IF NOT EXISTS idx_employees_new_password_hash ON employees_new(password_hash);

-- Add comment for documentation
COMMENT ON COLUMN employees_new.password_hash IS 'Hashed password for employee authentication';

COMMIT;
