-- Create the non-superuser application role used to ENFORCE RLS.
-- RLS is bypassed by superusers, so the app must connect as this role for the
-- policies in scripts/rls_policies.sql to take effect.
--
-- Run as a superuser, supplying a password (do NOT commit the password):
--   psql "$ADMIN_DATABASE_URL" -v app_pw="'choose-a-strong-password'" -f scripts/create_app_role.sql
--
-- Then build the app connection string with this role and set it as the
-- Railway DATABASE_URL (see RLS_CUTOVER.md).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotaclock_app') THEN
    EXECUTE format('CREATE ROLE rotaclock_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', current_setting('app_pw', true));
  END IF;
END $$;

-- Privileges on the current schema + all existing/future tables & sequences.
GRANT USAGE ON SCHEMA public TO rotaclock_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rotaclock_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rotaclock_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rotaclock_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rotaclock_app;

-- Execute on functions (incl. the SECURITY DEFINER login lookup auth_login_candidates).
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rotaclock_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO rotaclock_app;

-- Allow the app role to set the per-request tenant GUC.
-- (current_tenant() reads current_setting('app.tenant_id', true).)
