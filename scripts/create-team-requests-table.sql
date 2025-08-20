-- Migration script to create team_requests table
-- Run this script to add team request functionality

CREATE TABLE IF NOT EXISTS team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('dock', 'bonus')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    effective_date DATE NOT NULL,
    additional_notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES employees(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_requests_team_lead_id ON team_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_team_id ON team_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_employee_id ON team_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_team_requests_type ON team_requests(type);
CREATE INDEX IF NOT EXISTS idx_team_requests_status ON team_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_requests_effective_date ON team_requests(effective_date);
CREATE INDEX IF NOT EXISTS idx_team_requests_created_at ON team_requests(created_at);

-- Add comments for documentation
COMMENT ON TABLE team_requests IS 'Stores dock and bonus requests created by team leads for admin approval';
COMMENT ON COLUMN team_requests.team_lead_id IS 'ID of the team lead who created the request';
COMMENT ON COLUMN team_requests.team_id IS 'ID of the team this request belongs to';
COMMENT ON COLUMN team_requests.employee_id IS 'ID of the employee the request is for';
COMMENT ON COLUMN team_requests.type IS 'Type of request (dock or bonus)';
COMMENT ON COLUMN team_requests.amount IS 'Amount of dock or bonus in currency';
COMMENT ON COLUMN team_requests.reason IS 'Reason for the dock or bonus request';
COMMENT ON COLUMN team_requests.effective_date IS 'Date when the dock or bonus should take effect';
COMMENT ON COLUMN team_requests.additional_notes IS 'Additional notes from the team lead';
COMMENT ON COLUMN team_requests.status IS 'Current status of the request (pending, approved, rejected)';
COMMENT ON COLUMN team_requests.admin_notes IS 'Notes from the admin reviewing the request';
COMMENT ON COLUMN team_requests.reviewed_by IS 'ID of the admin who reviewed the request';
COMMENT ON COLUMN team_requests.reviewed_at IS 'Timestamp when the request was reviewed';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_requests_updated_at 
    BEFORE UPDATE ON team_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_team_requests_updated_at();
