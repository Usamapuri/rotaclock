-- RLS policies for tenant isolation (defense-in-depth)
-- This script is idempotent and safe to re-run.

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

    -- Common predicate
    -- Allow when current_tenant() is NULL (no context set) OR tenant_id equals setting
    -- Cast tenant_id to text to avoid type issues
    EXECUTE format('CREATE POLICY rls_%s_sel ON %I FOR SELECT USING (current_tenant() IS NULL OR tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_ins ON %I FOR INSERT WITH CHECK (current_tenant() IS NULL OR tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_upd ON %I FOR UPDATE USING (current_tenant() IS NULL OR tenant_id::text = current_tenant()) WITH CHECK (current_tenant() IS NULL OR tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
    EXECUTE format('CREATE POLICY rls_%s_del ON %I FOR DELETE USING (current_tenant() IS NULL OR tenant_id::text = current_tenant())', replace(tname, ' ', '_'), tname);
  END LOOP;
END $$;


