# Legacy Database Files to Remove

## SQL Files (67 total)

### Core Schema Files (Keep only database-schema.sql)
- `scripts/rotaclock_multitenant_schema.sql` - **REMOVE** (replaced by database-schema.sql)
- `scripts/multi_tenant_schema.sql` - **REMOVE** (replaced by database-schema.sql)
- `scripts/optimized-database-schema.sql` - **REMOVE** (replaced by database-schema.sql)
- `scripts/create-complete-schema.sql` - **REMOVE** (replaced by database-schema.sql)
- `scripts/create-postgres-schema.sql` - **REMOVE** (replaced by database-schema.sql)
- `scripts/setup-database.sql` - **REMOVE** (replaced by database-schema.sql)
- `database-setup-step-by-step.sql` - **REMOVE** (replaced by database-schema.sql)

### Migration Files (All legacy)
- `scripts/migrations/006_create_project_and_team_tables.sql` - **REMOVE**
- `scripts/migrations/006_add_rota_system.sql` - **REMOVE**
- `scripts/migrations/005_add_tenant_id_to_tables.sql` - **REMOVE**
- `scripts/migrations/004_add_project_and_team_tables.sql` - **REMOVE**
- `scripts/migrations/004_add_project_and_team_sample_data.sql` - **REMOVE**

### Individual Table Creation Files (All legacy)
- `scripts/add_project_tables.sql` - **REMOVE**
- `scripts/add_employee.sql` - **REMOVE**
- `scripts/add-shift-approval-system.sql` - **REMOVE**
- `scripts/add-time-entry-approvals.sql` - **REMOVE**
- `scripts/add-assignment-overrides.sql` - **REMOVE**
- `scripts/add-password-to-employees-new.sql` - **REMOVE**
- `scripts/add-password-field.sql` - **REMOVE**
- `scripts/add-online-status.sql` - **REMOVE**
- `scripts/add-shift-remarks-fields.sql` - **REMOVE**
- `scripts/add-broadcast-type.sql` - **REMOVE**
- `scripts/add-notification-priority.sql` - **REMOVE**
- `scripts/add-performance-indexes.sql` - **REMOVE**

### Table Creation Files (All legacy)
- `scripts/create-shift-logs-tables.sql` - **REMOVE**
- `scripts/create-projects.sql` - **REMOVE**
- `scripts/create-project-manager.sql` - **REMOVE**
- `scripts/create-performance-metrics.sql` - **REMOVE**
- `scripts/create-teams-and-teamlead.sql` - **REMOVE**
- `scripts/create-payroll-tables.sql` - **REMOVE**
- `scripts/create-verification-logs-table.sql` - **REMOVE**
- `scripts/create-onboarding-tables.sql` - **REMOVE**
- `scripts/create-team-requests-table.sql` - **REMOVE**
- `scripts/create-team-reports-table.sql` - **REMOVE**
- `scripts/create-audit-log-table.sql` - **REMOVE**

### Migration Scripts (All legacy)
- `scripts/destructive_consolidation_migration.sql` - **REMOVE**
- `scripts/migrate-to-multi-tenant-fixed.sql` - **REMOVE**
- `scripts/migrate-to-multi-tenant.sql` - **REMOVE**
- `scripts/create-multi-tenant-schema.sql` - **REMOVE**
- `scripts/migrate-to-optimized-schema.sql` - **REMOVE**
- `scripts/migrate-employee-codes.sql` - **REMOVE**
- `scripts/dashboard_optimization_migration.sql` - **REMOVE**

### Data Population Files (All legacy)
- `scripts/populate-employees-new.sql` - **REMOVE**
- `scripts/create-projects-for-employees-new.sql` - **REMOVE**
- `scripts/create-teams-for-employees-new.sql` - **REMOVE**
- `scripts/seed-onboarding-data-postgres.sql` - **REMOVE**
- `scripts/seed-onboarding-data.sql` - **REMOVE**
- `scripts/seed-complete-data.sql` - **REMOVE**
- `scripts/demo-data.sql` - **REMOVE**
- `scripts/mock-data.sql` - **REMOVE**

### Sample Data Files (All legacy)
- `sample-data-simple-uuid.sql` - **REMOVE**
- `sample-data-simple.sql` - **REMOVE**
- `sample-data-fixed.sql` - **REMOVE**
- `sample-data-basic.sql` - **REMOVE**

### Utility/Check Files (All legacy)
- `scripts/check-project-tables.sql` - **REMOVE**
- `scripts/check-employees-new-columns.sql` - **REMOVE**
- `scripts/check-employees-new-structure.sql` - **REMOVE**
- `scripts/verify-teams-tables.sql` - **REMOVE**
- `scripts/check-existing-team-tables.sql` - **REMOVE**
- `scripts/check-teams.sql` - **REMOVE**
- `scripts/cleanup_db.sql` - **REMOVE**
- `scripts/fix_payroll_records.sql` - **REMOVE**
- `scripts/fixes/mark_non_admin_as_agents.sql` - **REMOVE**

### RLS and Security Files (Keep for reference)
- `scripts/rls_reset.sql` - **KEEP** (Row Level Security setup)
- `scripts/rls_policies.sql` - **KEEP** (Row Level Security policies)
- `scripts/verify_tenant_isolation.sql` - **KEEP** (Tenant isolation verification)
- `scripts/rotaclock_multitenant_constraints_fix.sql` - **KEEP** (Constraint fixes)

## JavaScript Migration Files (120 total)

### All migration scripts should be removed:
- `scripts/verify-tenant-isolation.js` - **REMOVE**
- `scripts/test-db-connection.js` - **REMOVE**
- `scripts/test-connections.js` - **REMOVE**
- `scripts/simple-copy.js` - **REMOVE**
- `scripts/seed-tenants.js` - **REMOVE**
- `scripts/run-sql-file.js` - **REMOVE**
- `scripts/run-destructive-migration.js` - **REMOVE**
- `scripts/create-admin-audit-table.js` - **REMOVE**
- `scripts/test-organization-signup.js` - **REMOVE**
- `scripts/run-multi-tenant-migration.js` - **REMOVE**
- `scripts/generate-test-shift-data.js` - **REMOVE**
- `scripts/run-shift-approval-migration.js` - **REMOVE**
- `scripts/debug-admin-role.js` - **REMOVE**
- `scripts/check-admin-password.js` - **REMOVE**
- `scripts/update-employee-emails.js` - **REMOVE**
- `scripts/check-db-structure.js` - **REMOVE**
- `scripts/fix-login-redirects.js` - **REMOVE**
- `scripts/run-migration.js` - **REMOVE**
- `scripts/check-schema.js` - **REMOVE**
- `scripts/safe-migration.js` - **REMOVE**
- `scripts/execute-migration.js` - **REMOVE**
- `scripts/cleanup-scheduling-database.js` - **REMOVE**
- `scripts/test-realtime-updates.js` - **REMOVE**
- `scripts/test-performance.js` - **REMOVE**
- `scripts/test-fixes.js` - **REMOVE**
- `scripts/check-project-managers.js` - **REMOVE**
- `scripts/test-pm-team-reports.js` - **REMOVE**
- `scripts/create-test-team-reports.js` - **REMOVE**
- `scripts/create-test-team-requests.js` - **REMOVE**
- `scripts/create-team-requests-table.js` - **REMOVE**
- `scripts/create-test-meeting-notes.js` - **REMOVE**
- `scripts/create-team-reports-table.js` - **REMOVE**
- `scripts/check-team-assignments.js` - **REMOVE**
- `scripts/fix-david-wilson-team.js` - **REMOVE**
- `scripts/optimize-database-performance.js` - **REMOVE**
- `scripts/monitor-slow-queries.js` - **REMOVE**
- `scripts/test-team-lead-frontend.js` - **REMOVE**
- `scripts/create-simple-test-requests.js` - **REMOVE**
- `scripts/test-team-lead-api.js` - **REMOVE**
- `scripts/check-employee-roles.js` - **REMOVE**
- `scripts/create-test-requests.js` - **REMOVE**
- `scripts/check-requests.js` - **REMOVE**
- `scripts/check-team-lead-users.js` - **REMOVE**
- `scripts/check-team-lead-user.js` - **REMOVE**
- `scripts/setup-test-database.js` - **REMOVE**
- `scripts/list-employees-and-roles.js` - **REMOVE**
- `scripts/fix-role-constraint-final.js` - **REMOVE**
- `scripts/fix-role-constraint-issue.js` - **REMOVE**
- `scripts/fix-role-constraints.js` - **REMOVE**
- `scripts/implement-role-based-system.js` - **REMOVE**
- `scripts/analyze-email-vs-dual-id.js` - **REMOVE**
- `scripts/migrate-to-email-system.js` - **REMOVE**
- `scripts/check-employee-id-types.js` - **REMOVE**
- `scripts/test-payroll-calculation-manual.js` - **REMOVE**
- `scripts/create-payroll-period.js` - **REMOVE**
- `scripts/create-sample-shift-logs.js` - **REMOVE**
- `scripts/check-payroll-tables-structure.js` - **REMOVE**
- `scripts/test-payroll-direct.js` - **REMOVE**
- `scripts/test-payroll-calculation.js` - **REMOVE**
- `scripts/test-payroll-api.js` - **REMOVE**
- `scripts/check-payroll-constraints.js` - **REMOVE**
- `scripts/add-payroll-unique-constraint.js` - **REMOVE**
- `scripts/check-shift-logs-structure.js` - **REMOVE**
- `scripts/check-payroll-data.js` - **REMOVE**
- `scripts/test-payroll-tables.js` - **REMOVE**
- `scripts/create-test-payroll-period.js` - **REMOVE**
- `scripts/initialize-employee-salaries.js` - **REMOVE**
- `scripts/run-payroll-migration-simple.js` - **REMOVE**
- `scripts/run-payroll-migration.js` - **REMOVE**
- `scripts/test-verification-fix.js` - **REMOVE**
- `scripts/add-verification-logs-table.js` - **REMOVE**
- `scripts/test-simple-verification.js` - **REMOVE**
- `scripts/test-simple-verification-detailed.js` - **REMOVE**
- `scripts/test-step4-verification.js` - **REMOVE**
- `scripts/test-step3-verification.js` - **REMOVE**
- `scripts/test-step2-verification.js` - **REMOVE**
- `scripts/test-minimal-verification.js` - **REMOVE**
- `scripts/test-file-system.js` - **REMOVE**
- `scripts/debug-james-taylor.js` - **REMOVE**
- `scripts/test-verification-api.js` - **REMOVE**
- `scripts/test-email-verification.js` - **REMOVE**
- `scripts/debug-verification.js` - **REMOVE**
- `scripts/run-railway-migrations.js` - **REMOVE**
- `scripts/run-migrations.js` - **REMOVE**
- `scripts/test-new-workflow.js` - **REMOVE**
- `scripts/seed-pm-demo.js` - **REMOVE**
- `scripts/seed-teams-demo.js` - **REMOVE**
- `scripts/run-teamlead-migrations.js` - **REMOVE**
- `scripts/test-notifications.js` - **REMOVE**
- `scripts/set-test-passwords.js` - **REMOVE**
- `scripts/seed-today-metrics.js` - **REMOVE**
- `scripts/test-teamlead-apis.js` - **REMOVE**
- `scripts/test-broadcast.js` - **REMOVE**
- `scripts/update-notifications-constraint.js` - **REMOVE**
- `scripts/test-notifications-table.js` - **REMOVE**
- `scripts/check-employee-user-ids.js` - **REMOVE**
- `scripts/test-polling.js` - **REMOVE**
- `scripts/test-sse-simple.js` - **REMOVE**
- `scripts/test-sse.js` - **REMOVE**
- `scripts/test-break-metrics.js` - **REMOVE**
- `scripts/test-api-service.js` - **REMOVE**
- `scripts/test-admin-api.js` - **REMOVE**
- `scripts/check-employee-ids.js` - **REMOVE**
- `scripts/test-employee-schedule.js` - **REMOVE**
- `scripts/fix-employee-passwords.js` - **REMOVE**
- `scripts/check-weekly-assignments.js` - **REMOVE**
- `scripts/set-employee-password.js` - **REMOVE**
- `scripts/update-shift-status.js` - **REMOVE**
- `scripts/create-weekly-shifts.js` - **REMOVE**
- `scripts/add-today-shifts.js` - **REMOVE**
- `scripts/test-shift-logs.js` - **REMOVE**
- `scripts/check-passwords.js` - **REMOVE**
- `scripts/test-login.js` - **REMOVE**
- `scripts/create-shift-logs.js` - **REMOVE**
- `scripts/init-shift-logs.js` - **REMOVE**
- `scripts/test-verification.js` - **REMOVE**
- `scripts/test-authentication.js` - **REMOVE**
- `scripts/add-employee-passwords.js` - **REMOVE**
- `scripts/add-more-data.js` - **REMOVE**
- `scripts/load-mock-data.js` - **REMOVE**

## Summary

**Total files to remove: 187**
- SQL files: 67 (keep 4 for RLS/security)
- JavaScript files: 120 (remove all)

**Files to keep:**
- `database-schema.sql` (NEW - consolidated schema)
- `scripts/rls_reset.sql` (Row Level Security setup)
- `scripts/rls_policies.sql` (Row Level Security policies)
- `scripts/verify_tenant_isolation.sql` (Tenant isolation verification)
- `scripts/rotaclock_multitenant_constraints_fix.sql` (Constraint fixes)

This cleanup will eliminate all legacy database files and provide a single source of truth for the database schema.
