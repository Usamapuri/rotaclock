-- 005: Reconcile current_tenant() to read the per-request GUC the app sets
-- (SET app.tenant_id), instead of the old hardcoded RETURN 'default-tenant'.
-- Required for RLS policies to resolve the real tenant. Idempotent.
-- DROP first: the old version returned VARCHAR(80); CREATE OR REPLACE cannot
-- change a function's return type. (No RLS policies depend on it yet — they are
-- applied during the cutover, after this.)

DROP FUNCTION IF EXISTS current_tenant();

CREATE OR REPLACE FUNCTION current_tenant()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.tenant_id', true)
$$;
