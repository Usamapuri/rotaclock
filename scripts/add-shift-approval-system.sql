-- Add shift approval system to existing shift_logs table
-- This migration adds approval workflow fields to the shift_logs table

-- Add approval-related columns to shift_logs table
ALTER TABLE shift_logs 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'edited')),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS approved_rate DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS total_pay DECIMAL(10,2);

-- Create shift_approvals table for tracking approval history
CREATE TABLE IF NOT EXISTS shift_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_log_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    approver_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'reject', 'edit')),
    original_hours DECIMAL(5,2),
    approved_hours DECIMAL(5,2),
    original_rate DECIMAL(8,2),
    approved_rate DECIMAL(8,2),
    notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shift_logs_approval_status ON shift_logs(approval_status);
CREATE INDEX IF NOT EXISTS idx_shift_logs_approved_by ON shift_logs(approved_by);
CREATE INDEX IF NOT EXISTS idx_shift_approvals_shift_log_id ON shift_approvals(shift_log_id);
CREATE INDEX IF NOT EXISTS idx_shift_approvals_employee_id ON shift_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_approvals_approver_id ON shift_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_shift_approvals_created_at ON shift_approvals(created_at);

-- Add comments for documentation
COMMENT ON COLUMN shift_logs.approval_status IS 'Status of shift approval: pending, approved, rejected, edited';
COMMENT ON COLUMN shift_logs.approved_by IS 'Employee ID of the admin who approved/rejected the shift';
COMMENT ON COLUMN shift_logs.approved_at IS 'Timestamp when the shift was approved/rejected';
COMMENT ON COLUMN shift_logs.rejection_reason IS 'Reason for rejection if shift was rejected';
COMMENT ON COLUMN shift_logs.admin_notes IS 'Notes added by admin during approval process';
COMMENT ON COLUMN shift_logs.approved_hours IS 'Hours approved by admin (may differ from actual hours)';
COMMENT ON COLUMN shift_logs.approved_rate IS 'Hourly rate approved for this shift';
COMMENT ON COLUMN shift_logs.total_pay IS 'Total pay calculated for this shift (approved_hours * approved_rate)';

COMMENT ON TABLE shift_approvals IS 'Audit trail of all shift approval actions';

-- Update existing completed shifts to have approved status
UPDATE shift_logs 
SET approval_status = 'approved', 
    approved_hours = total_shift_hours,
    approved_at = updated_at
WHERE status = 'completed' AND approval_status = 'pending';
