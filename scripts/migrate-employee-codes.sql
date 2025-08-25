-- Ensure employee_code has EMP-prefixed values across the optimized schema
-- Safe to run multiple times (idempotent-ish):

-- 1) Create a dedicated sequence if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relkind='S' AND relname='employee_code_seq') THEN
    CREATE SEQUENCE employee_code_seq START 1;
  END IF;
END$$;

-- 2) Backfill employee_code on employees_new where missing or not starting with 'EMP'
--    Uses the sequence to generate unique, compact business identifiers
UPDATE employees_new e
SET employee_code = 'EMP' || LPAD(nextval('employee_code_seq')::text, 3, '0')
WHERE (e.employee_code IS NULL OR e.employee_code !~ '^EMP');

-- 3) Optional: Normalize codes to uppercase (in case of mixed casing)
UPDATE employees_new e
SET employee_code = UPPER(e.employee_code)
WHERE e.employee_code IS NOT NULL AND e.employee_code != UPPER(e.employee_code);

-- 4) Enforce uniqueness and presence if not already enforced
ALTER TABLE IF EXISTS employees_new
  ADD CONSTRAINT IF NOT EXISTS employees_new_employee_code_unique UNIQUE (employee_code);

-- 5) Report summary
--    Note: This just returns counts when run via a client that displays query results.
SELECT COUNT(*) AS total_employees, COUNT(employee_code) AS with_codes
FROM employees_new;


