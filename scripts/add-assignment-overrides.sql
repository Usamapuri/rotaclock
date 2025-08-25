-- Adds per-assignment override columns and relaxes template_id constraint
-- Safe, idempotent migration. Can be run multiple times.

BEGIN;

-- 1) Ensure optional override columns exist
ALTER TABLE IF EXISTS shift_assignments_new
  ADD COLUMN IF NOT EXISTS override_name TEXT,
  ADD COLUMN IF NOT EXISTS override_start_time TIME,
  ADD COLUMN IF NOT EXISTS override_end_time TIME,
  ADD COLUMN IF NOT EXISTS override_color TEXT;

-- 2) Make template_id nullable to allow pure custom assignments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shift_assignments_new' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE shift_assignments_new ALTER COLUMN template_id DROP NOT NULL;
  END IF;
END$$;

-- 3) Helpful indexes (no-op if already present)
CREATE INDEX IF NOT EXISTS idx_assignments_employee_date ON shift_assignments_new(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_date ON shift_assignments_new(date);

COMMIT;
