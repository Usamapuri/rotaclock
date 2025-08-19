-- Migration script to add online status fields to employees table
-- Run this script to update existing databases

-- Add online status fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_online TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN employees.is_online IS 'Indicates if the employee is currently online/active';
COMMENT ON COLUMN employees.last_online IS 'Timestamp of when the employee was last online';

-- Update existing records to have default values
UPDATE employees 
SET is_online = false, last_online = NOW()
WHERE is_online IS NULL OR last_online IS NULL;

-- Create index for better performance on online status queries
CREATE INDEX IF NOT EXISTS idx_employees_online_status ON employees(is_online, last_online);
