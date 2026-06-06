-- 002: Close tenant-isolation gaps — add tenant_id to break_logs and
-- step_completions, backfill from their parent rows, and index it.
-- Idempotent: safe to run repeatedly.

-- break_logs (legacy; writes currently go to time_entries). Backfill from the
-- owning employee so any historical rows get a tenant.
ALTER TABLE break_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
UPDATE break_logs bl
   SET tenant_id = e.tenant_id
  FROM employees e
 WHERE bl.employee_id = e.id
   AND bl.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_break_logs_tenant ON break_logs(tenant_id);

-- step_completions. Backfill from the onboarding step it belongs to.
ALTER TABLE step_completions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
UPDATE step_completions sc
   SET tenant_id = os.tenant_id
  FROM onboarding_steps os
 WHERE sc.step_id = os.id
   AND sc.tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_step_completions_tenant ON step_completions(tenant_id);
