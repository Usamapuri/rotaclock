-- 003: Guarantee the shift_assignments override columns exist so the app no
-- longer has to probe information_schema at request time. These columns are in
-- the canonical schema; this backfills any older DB that predates them.
-- Idempotent.

ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS override_name VARCHAR(255);
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS override_start_time TIME;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS override_end_time TIME;
ALTER TABLE shift_assignments ADD COLUMN IF NOT EXISTS override_color VARCHAR(32);
