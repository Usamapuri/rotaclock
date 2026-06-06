-- 2-tenant RLS isolation test. Self-contained and non-destructive: everything
-- runs in a transaction that ROLLs BACK, so no role/policy/data persists.
--
-- Proves that under a NON-superuser role with `app.tenant_id` set, a tenant sees
-- only its own rows. Run as a superuser:
--   psql "$ADMIN_DATABASE_URL" -f scripts/verify_tenant_isolation.sql

BEGIN;

-- Temporary least-privileged role to exercise RLS (superusers bypass it).
CREATE ROLE rls_test_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO rls_test_role;
GRANT SELECT, INSERT ON employees TO rls_test_role;

-- Strict RLS on employees (mirrors scripts/rls_policies.sql).
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_test_sel ON employees;
CREATE POLICY rls_test_sel ON employees FOR SELECT USING (tenant_id::text = current_tenant());

-- Seed two tenants' rows (as superuser → bypasses RLS for the insert).
INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
VALUES ('rls_t1', 'RLST1', 'A', 'One', 'rls_t1@example.com', 'employee', true),
       ('rls_t2', 'RLST2', 'B', 'Two', 'rls_t2@example.com', 'employee', true);

-- Act as the non-superuser role, scoped to tenant 1.
SET ROLE rls_test_role;
SELECT set_config('app.tenant_id', 'rls_t1', true);

DO $$
DECLARE own_cnt int; other_cnt int;
BEGIN
  SELECT count(*) INTO own_cnt   FROM employees WHERE email = 'rls_t1@example.com';
  SELECT count(*) INTO other_cnt FROM employees WHERE email = 'rls_t2@example.com';
  IF own_cnt <> 1 THEN
    RAISE EXCEPTION 'RLS FAIL: tenant_t1 cannot see its own row (got %)', own_cnt;
  END IF;
  IF other_cnt <> 0 THEN
    RAISE EXCEPTION 'RLS FAIL: tenant_t1 can see tenant_t2 rows (got %)', other_cnt;
  END IF;
  RAISE NOTICE 'RLS isolation OK: tenant_t1 sees % own row(s), % other-tenant row(s)', own_cnt, other_cnt;
END $$;

RESET ROLE;
ROLLBACK;
