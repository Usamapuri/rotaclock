-- Create approvals table for time entries reviewed by team leads/project managers
BEGIN;

CREATE TABLE IF NOT EXISTS time_entry_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID UNIQUE NOT NULL,
  employee_id UUID NOT NULL,
  approver_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  decision_notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entry_approvals_status ON time_entry_approvals(status);
CREATE INDEX IF NOT EXISTS idx_time_entry_approvals_employee ON time_entry_approvals(employee_id);

COMMIT;


