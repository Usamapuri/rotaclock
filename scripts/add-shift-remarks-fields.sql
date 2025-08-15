-- Migration script to add shift remarks fields to shift_logs table
-- Run this script to update existing databases

-- Add shift remarks and performance fields to shift_logs table
ALTER TABLE shift_logs 
ADD COLUMN IF NOT EXISTS total_calls_taken INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shift_remarks TEXT,
ADD COLUMN IF NOT EXISTS performance_rating INTEGER CHECK (performance_rating >= 1 AND performance_rating <= 5);

-- Add comments for documentation
COMMENT ON COLUMN shift_logs.total_calls_taken IS 'Total number of calls handled during the shift';
COMMENT ON COLUMN shift_logs.leads_generated IS 'Number of leads generated during the shift';
COMMENT ON COLUMN shift_logs.shift_remarks IS 'Employee remarks and notes about the shift';
COMMENT ON COLUMN shift_logs.performance_rating IS 'Self-rated performance score (1-5)';

-- Update existing records to have default values
UPDATE shift_logs 
SET total_calls_taken = 0, leads_generated = 0 
WHERE total_calls_taken IS NULL OR leads_generated IS NULL;
