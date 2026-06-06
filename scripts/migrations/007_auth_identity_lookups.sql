-- 007: SECURITY DEFINER identity/tenant resolution so the app can authenticate a
-- request and discover its tenant BEFORE app.tenant_id is set. Under RLS these
-- employees/organizations reads would otherwise return nothing (no tenant yet),
-- breaking every authenticated request. These functions run as their owner
-- (bypassing RLS) and return only what auth needs. Idempotent.

-- Used by loadApiUser() (lib/api-auth.ts).
CREATE OR REPLACE FUNCTION auth_employee_identity(p_id uuid)
RETURNS TABLE (id uuid, employee_code varchar, email varchar, role varchar)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT e.id, e.employee_code, e.email, e.role
  FROM employees e
  WHERE e.id = p_id AND e.is_active = true
$$;

-- Used by getTenantContext() (lib/tenant-middleware.ts).
CREATE OR REPLACE FUNCTION auth_tenant_context(p_id uuid)
RETURNS TABLE (
  tenant_id varchar,
  organization_id uuid,
  email varchar,
  organization_name varchar,
  subscription_status varchar,
  subscription_plan varchar
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT e.tenant_id, e.organization_id, e.email,
         o.name AS organization_name, o.subscription_status, o.subscription_plan
  FROM employees e
  LEFT JOIN organizations o ON e.organization_id = o.id
  WHERE e.id = p_id
$$;
