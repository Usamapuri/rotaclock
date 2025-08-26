-- Create admin_audit_logs table for tracking impersonation and other admin actions
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);

-- Add comments for documentation
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for admin actions including impersonation';
COMMENT ON COLUMN admin_audit_logs.admin_id IS 'ID of the admin performing the action';
COMMENT ON COLUMN admin_audit_logs.action IS 'Type of action performed (e.g., impersonation_start, impersonation_end)';
COMMENT ON COLUMN admin_audit_logs.target_user_id IS 'ID of the user being acted upon (for impersonation, this is the impersonated user)';
COMMENT ON COLUMN admin_audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN admin_audit_logs.created_at IS 'Timestamp when the action was performed';
