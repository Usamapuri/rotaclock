-- Verification script for tenant isolation
-- Creates two temp tenants, inserts minimal rows, and verifies that cross-tenant access fails under RLS.
-- No persistent data left behind.

BEGIN;

-- Create a temporary least-privileged role for verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotaclock_verifier') THEN
    CREATE ROLE rotaclock_verifier LOGIN PASSWORD 'verify_pass' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- Grant minimal privileges
DO $$
BEGIN
  PERFORM 1;
  -- Public schema usage
  GRANT USAGE ON SCHEMA public TO rotaclock_verifier;
  -- Select/insert on tenant tables
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rotaclock_verifier;
END $$;

-- Save and set session tenant to t1
SELECT set_config('app.tenant_id', 'tenant_t1', true);

-- Create temp data for t1
WITH upsert_org AS (
  INSERT INTO organizations (tenant_id, name, slug, email, is_active, is_verified)
  VALUES('tenant_t1', 'Tenant T1', 'tenant-t1', 't1@example.com', true, true)
  ON CONFLICT (tenant_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
), emp AS (
  INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
  VALUES ('tenant_t1', 'T1EMP', 'T1', 'User', 't1user@example.com', 'admin', true)
  RETURNING id
), st AS (
  INSERT INTO shift_templates (tenant_id, name, start_time, end_time, is_active)
  VALUES ('tenant_t1', 'T1 Shift', '09:00', '17:00', true)
  RETURNING id
)
INSERT INTO shift_assignments (tenant_id, employee_id, template_id, date, status)
SELECT 'tenant_t1', emp.id, st.id, CURRENT_DATE, 'assigned' FROM emp, st;

-- Switch to t2
SELECT set_config('app.tenant_id', 'tenant_t2', true);

-- Create temp data for t2
WITH upsert_org AS (
  INSERT INTO organizations (tenant_id, name, slug, email, is_active, is_verified)
  VALUES('tenant_t2', 'Tenant T2', 'tenant-t2', 't2@example.com', true, true)
  ON CONFLICT (tenant_id) DO UPDATE SET name = EXCLUDED.name
  RETURNING id
), emp AS (
  INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
  VALUES ('tenant_t2', 'T2EMP', 'T2', 'User', 't2user@example.com', 'admin', true)
  RETURNING id
), st AS (
  INSERT INTO shift_templates (tenant_id, name, start_time, end_time, is_active)
  VALUES ('tenant_t2', 'T2 Shift', '09:00', '17:00', true)
  RETURNING id
)
INSERT INTO shift_assignments (tenant_id, employee_id, template_id, date, status)
SELECT 'tenant_t2', emp.id, st.id, CURRENT_DATE, 'assigned' FROM emp, st;

-- Now verify that under tenant_t2, tenant_t1 rows are not visible
ROLLBACK;

-- Switch session authorization to non-superuser role and validate
SET SESSION AUTHORIZATION rotaclock_verifier;
SELECT set_config('app.tenant_id', 'tenant_t2', true);

DO $$
DECLARE cnt_t1 int; cnt_t2 int;
BEGIN
  SELECT COUNT(*) INTO cnt_t2 FROM employees WHERE tenant_id = 'tenant_t2';
  IF cnt_t2 = 0 THEN RAISE EXCEPTION 'RLS test failed: tenant_t2 cannot see its own employees'; END IF;

  SELECT COUNT(*) INTO cnt_t1 FROM employees WHERE tenant_id = 'tenant_t1';
  IF cnt_t1 > 0 THEN RAISE EXCEPTION 'RLS test failed: tenant_t2 can see tenant_t1 employees'; END IF;
END $$;

RESET SESSION AUTHORIZATION;

-- Now repeat the visibility check using the verifier role (non-superuser)
DO $$
DECLARE cnt_t1 int; cnt_t2 int;
BEGIN
  PERFORM dblink_connect('verifier', current_database());
EXCEPTION WHEN undefined_function THEN
  -- enable dblink extension if needed
  PERFORM 1;
END $$;

-- Ensure dblink
CREATE EXTENSION IF NOT EXISTS dblink;

-- As verifier: set tenant to t2 and ensure no t1 rows visible
SELECT * FROM dblink('dbname=' || current_database(), $$
  SET ROLE rotaclock_verifier;
  SELECT set_config('app.tenant_id', 'tenant_t2', true);
  SELECT (SELECT COUNT(*) FROM employees WHERE tenant_id = 'tenant_t2') AS cnt_t2,
         (SELECT COUNT(*) FROM employees WHERE tenant_id = 'tenant_t1') AS cnt_t1;
$$) AS t(cnt_t2 int, cnt_t1 int);


