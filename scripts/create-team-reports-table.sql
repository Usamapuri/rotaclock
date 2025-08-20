-- Migration script to create team_reports table
-- Run this script to add team report functionality

CREATE TABLE IF NOT EXISTS team_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_lead_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_name VARCHAR(255) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    summary TEXT NOT NULL,
    highlights JSONB DEFAULT '[]',
    concerns JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    statistics JSONB NOT NULL,
    meeting_notes JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    pm_notes TEXT,
    pm_reviewed_by UUID REFERENCES employees(id),
    pm_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_reports_team_lead_id ON team_reports(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_reports_team_id ON team_reports(team_id);
CREATE INDEX IF NOT EXISTS idx_team_reports_date_range ON team_reports(date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_team_reports_status ON team_reports(status);
CREATE INDEX IF NOT EXISTS idx_team_reports_created_at ON team_reports(created_at);

-- Add comments for documentation
COMMENT ON TABLE team_reports IS 'Stores consolidated team reports created by team leads';
COMMENT ON COLUMN team_reports.team_lead_id IS 'ID of the team lead who created the report';
COMMENT ON COLUMN team_reports.team_id IS 'ID of the team this report covers';
COMMENT ON COLUMN team_reports.team_name IS 'Name of the team at the time of report creation';
COMMENT ON COLUMN team_reports.date_from IS 'Start date of the reporting period';
COMMENT ON COLUMN team_reports.date_to IS 'End date of the reporting period';
COMMENT ON COLUMN team_reports.summary IS 'Team lead summary of the reporting period';
COMMENT ON COLUMN team_reports.highlights IS 'JSON array of key highlights from the period';
COMMENT ON COLUMN team_reports.concerns IS 'JSON array of concerns raised by team members';
COMMENT ON COLUMN team_reports.recommendations IS 'JSON array of recommendations from team lead';
COMMENT ON COLUMN team_reports.statistics IS 'JSON object containing team statistics';
COMMENT ON COLUMN team_reports.meeting_notes IS 'JSON array of all meeting notes from the period';
COMMENT ON COLUMN team_reports.status IS 'Current status of the report (pending, reviewed, approved, rejected)';
COMMENT ON COLUMN team_reports.pm_notes IS 'Notes from the project manager reviewing the report';
COMMENT ON COLUMN team_reports.pm_reviewed_by IS 'ID of the project manager who reviewed the report';
COMMENT ON COLUMN team_reports.pm_reviewed_at IS 'Timestamp when the report was reviewed by PM';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_reports_updated_at 
    BEFORE UPDATE ON team_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_team_reports_updated_at();
