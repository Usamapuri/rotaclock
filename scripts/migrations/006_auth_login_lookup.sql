-- 006: SECURITY DEFINER login lookup so /api/auth/login can find a user by email
-- BEFORE a tenant is known. Under RLS the app role can't read employees without
-- app.tenant_id set; this function runs as its owner (bypassing RLS) and returns
-- only the columns login needs. Idempotent.

CREATE OR REPLACE FUNCTION auth_login_candidates(p_email text)
RETURNS TABLE (
  id uuid,
  email varchar,
  employee_code varchar,
  first_name varchar,
  last_name varchar,
  department varchar,
  job_position varchar,
  role varchar,
  team_id uuid,
  password_hash text,
  tenant_id varchar,
  organization_id uuid,
  organization_name varchar,
  org_is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT e.id, e.email, e.employee_code, e.first_name, e.last_name, e.department,
         e.job_position, e.role, e.team_id, e.password_hash, e.tenant_id, e.organization_id,
         o.name AS organization_name, o.is_active AS org_is_active
  FROM employees e
  LEFT JOIN organizations o ON e.organization_id = o.id
  WHERE LOWER(TRIM(e.email)) = LOWER(TRIM(p_email)) AND e.is_active = true
$$;
