-- Drop all existing RLS policies for tenant tables, then re-apply ours
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname, schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'organizations','organization_admins','employees','projects','teams','team_assignments','manager_projects','manager_teams',
        'shift_templates','shift_assignments','time_entries','shift_logs','break_logs','attendance_summary','leave_requests','shift_swaps',
        'payroll_periods','payroll_records','payroll_bonuses','payroll_deductions','employee_salaries','roles','role_assignments','audit_logs',
        'notifications','verification_logs','shift_verifications','time_entry_approvals','onboarding_templates','onboarding_steps',
        'onboarding_processes','step_completions','onboarding_documents','onboarding_feedback','training_assignments','team_requests','team_reports',
        'performance_metrics','quality_scores','employee_availability'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.polname, r.schemaname, r.tablename);
  END LOOP;
END $$;


