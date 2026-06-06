-- 004: Reconcile step_completions with what the onboarding API uses.
-- The app reads/writes process_id, step_id, completed_by, completed_at, feedback;
-- the old shape had employee_id (NOT NULL — so inserts failed) and notes, which
-- the code never touches. Add the real columns, drop the unused ones. Idempotent.

ALTER TABLE step_completions ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES onboarding_processes(id);
ALTER TABLE step_completions ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES employees(id);
ALTER TABLE step_completions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE step_completions DROP COLUMN IF EXISTS employee_id;
ALTER TABLE step_completions DROP COLUMN IF EXISTS notes;
CREATE INDEX IF NOT EXISTS idx_step_completions_process ON step_completions(process_id);
