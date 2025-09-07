-- Purpose: Ensure employees appear on the scheduling grid by setting proper roles.
-- Context: The scheduling APIs now filter employees by role = 'agent'. If your
--          database has employees with NULL/other roles (e.g., 'employee'),
--          none will show up. Run this script once to normalize roles.

BEGIN;

-- 1) Quick visibility of current role distribution
--    (Uncomment to inspect before and after)
-- SELECT role, COUNT(*) AS num_employees FROM employees GROUP BY role ORDER BY role;

-- 2) Set NULL roles to 'agent'
UPDATE employees
SET role = 'agent'
WHERE role IS NULL;

-- 3) Convert generic/legacy roles to 'agent' while keeping special roles intact
UPDATE employees
SET role = 'agent'
WHERE role NOT IN ('admin', 'team_lead', 'project_manager', 'agent');

-- 4) Make sure agents are active
UPDATE employees
SET is_active = true
WHERE role = 'agent' AND (is_active IS DISTINCT FROM true);

-- 5) (Optional) Verify results
-- SELECT role, COUNT(*) AS num_employees FROM employees GROUP BY role ORDER BY role;

COMMIT;

-- How to run (examples):
-- - In Railway SQL console: paste this entire script and run
-- - psql: psql "$DATABASE_URL" -f scripts/fixes/mark_non_admin_as_agents.sql
-- - Node/pg: use any simple runner to execute this file


