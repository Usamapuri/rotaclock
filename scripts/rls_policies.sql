-- RLS policies for tenant isolation (defense-in-depth)
-- This script is idempotent and safe to re-run.
--
-- ⚠️ CUTOVER REQUIRED — do NOT apply in isolation. These policies are STRICT
-- (no NULL-bypass): a connection with no `app.tenant_id` set sees/writes nothing.
-- For the app to keep working after applying this you MUST also:
--   1. Run the app as a NON-SUPERUSER role (superusers bypass RLS). Switch the
--      Railway DATABASE_URL to that role.
--   2. Have the app run `SET app.tenant_id = '<tenant>'` on each request's
--      connection (see lib/database.ts request-scoped tenant work).
--   3. Give the LOGIN/auth path an exception — it looks up users by email
--      before a tenant is known. Use a SECURITY DEFINER lookup function or a
--      dedicated BYPASSRLS auth role, else nobody can log in.
-- Until that cutover is done the app connects as superuser and these policies
-- are inert. See HANDOVER.md / REFACTOR_PLAN.md Phase 3.

-- Helper: current_tenant() reads connection-local tenant setting
CREATE OR REPLACE FUNCTION current_tenant()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.tenant_id', true)
$$;

-- Utility to enable RLS and create standard policies for a table
-- Each policy allows access only when tenant_id matches current_tenant(),
-- or when current_tenant() is NULL (backward-compatibility until app sets it).
DO $$
DECLARE
  tbl text;
  tname text;
  policy_base text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations',
    'organization_admins',
    'employees',
    'projects',
    'teams',
    'team_assignments',
    'manager_projects',
    'manager_teams',
    'shift_templates',
    'shift_assignments',
    'time_entries',
    'shift_logs',
    'break_logs',
    'attendance_summary',
    'leave_requests',
    'shift_swaps',
    'payroll_periods',
    'payroll_records',
    'payroll_bonuses',
    'payroll_deductions',
    'employee_salaries',
    'roles',
    'role_assignments',
    'audit_logs',
    'notifications',
    'verification_logs',
    'shift_verifications',
    'time_entry_approvals',
    'onboarding_templates',
    'onboarding_steps',
    'onboarding_processes',
    'step_completions',
    'onboarding_documents',
    'onboarding_feedback',
    'training_assignments',
    'team_requests',
    'team_reports',
    'performance_metrics',
    'quality_scores',
    'employee_availability'
  ]) LOOP
    -- Skip tables that don't exist or do not have tenant_id
    PERFORM 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public';
    IF NOT FOUND THEN CONTINUE; END IF;
    PERFORM 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'tenant_id';
    IF NOT FOUND THEN CONTINUE; END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Drop existing policies if present
    tname := tbl;
    policy_base := replace(tname, ' ', '_');
    FOR policy_base IN SELECT unnest(ARRAY['sel','ins','upd','del']) LOOP
      EXECUTE format('DROP POLICY IF EXISTS rls_%s_%s ON %I', replace(tname, ' ', '_'), policy_base, tname);
    END LOOP;

    -- Strict predicate: tenant_id must equal the connection's app.tenant_id.
    -- (No NULL-bypass — see cutover note at the top of this file.)
    -- tenant_id is cast to text to avoid type issues.
    EXECUTE format('CREATE POLICY rls_%s_sel ON %I FOR SELECT USING (tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_ins ON %I FOR INSERT WITH CHECK (tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_upd ON %I FOR UPDATE USING (tenant_id::text = current_tenant()) WITH CHECK (tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_del ON %I FOR DELETE USING (tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
  END LOOP;
END $$;


