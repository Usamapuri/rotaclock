## Production Database Consolidation and Optimization Plan (Destructive)

This document is the single source of truth for consolidating our database to a clean, scalable, production-grade schema. It removes all legacy/duplicate tables and duplicate endpoints. The plan is intentionally destructive; we accept data loss in legacy objects to eliminate clutter and confusion.

Use the checkboxes to track progress. Owners and dates can be added in the right-most brackets.


### 1) Goals
- [ ] Eliminate legacy and duplicate tables and views [ ]
- [ ] Consolidate table names to a single canonical set (no `_new`) [ ]
- [ ] Enforce multi-tenant isolation and integrity via `tenant_id` everywhere [ ]
- [ ] Standardize on unified time tracking (no split shift/break logs) [ ]
- [ ] Index and structure for production performance and scalability [ ]
- [ ] Remove duplicate/conflicting API endpoints and queries [ ]
- [ ] Pass all unit/integration tests under new schema [ ]


### 2) Scope and assumptions
- Destructive migration: we will drop legacy tables and views outright to remove ambiguity.
- Railway-hosted PostgreSQL; no Supabase dependencies.
- The application will be aligned to one canonical schema set; compatibility views will NOT be kept.
- All APIs will filter and write by `tenant_id`.


### 3) Canonical schema (table names only)
- Employees and orgs: `organizations`, `employees`, `teams`, `team_assignments`, `role_history` (if used)
- Scheduling: `shift_templates`, `shift_assignments`, `shift_swaps`, `shift_approvals` (if used)
- Time & attendance: `time_entries` (unified), `attendance_summary`
- HR/Leave: `leave_requests`, `company_holidays`
- Notifications: `notifications`
- Payroll (if enabled): `payroll_periods`, `payroll_records`, `payroll_deductions`, `payroll_bonuses`, `employee_salaries`

Notes:
- No `_new` suffix in production table names.
- No separate `shift_logs` or `break_logs`. Time is unified under `time_entries`.


### 4) Pre-migration checklist
- [ ] Schedule a maintenance window with rollback plan [ ]
- [ ] Confirm production snapshot/backup retained and restorable [ ]
- [ ] Confirm app version freeze during migration window [ ]
- [ ] Confirm DBA credentials and access to production DB [ ]
- [ ] Confirm monitoring/alerts in place (errors, slow queries) [ ]


### 5) Drop legacy/duplicate tables and views (destructive)
Identify and drop any of the following if present (list is indicative; drop safely if they exist):
- [ ] `employees_legacy`, `employees_new` (post-rename), or any extra `employees` variants [ ]
- [ ] `shifts` (replaced by `shift_templates`) [ ]
- [ ] `shift_assignments_legacy`, `shift_assignments_new` (post-rename), or duplicates [ ]
- [ ] `time_entries_legacy`, `time_entries_new` (post-rename), or duplicates [ ]
- [ ] `shift_logs`, `break_logs` (replaced by unified `time_entries`) [ ]
- [ ] `teams_new` or legacy team variants [ ]
- [ ] Any leftover views/synonyms pointing to legacy tables [ ]

Acceptance criteria:
- [ ] A single table exists for each canonical name in Section 3 [ ]
- [ ] No tables with `_new`, `_legacy`, or duplicated names remain [ ]


### 6) Promote canonical tables (rename where applicable)
Promote currently-used tables to the canonical names from Section 3. For example:
- [ ] Rename current active employee table to `employees` [ ]
- [ ] Rename current active assignment table to `shift_assignments` [ ]
- [ ] Rename current active time-tracking table to `time_entries` [ ]
- [ ] Rename or recreate `shift_templates`, `teams`, `team_assignments`, etc., as needed [ ]

Acceptance criteria:
- [ ] All references in the app and scripts point to the canonical names [ ]


### 7) Enforce multi-tenancy and integrity
Across all canonical tables:
- [ ] Ensure `tenant_id` column exists and is NOT NULL [ ]
- [ ] Ensure FK relationships include `tenant_id` where applicable [ ]
- [ ] Enforce tenant-scoped uniqueness (e.g., `(tenant_id, employee_code)`) [ ]
- [ ] Enforce referential integrity with `ON DELETE` rules that match business needs [ ]
- [ ] Add CHECK constraints for status/type enums where used [ ]

Acceptance criteria:
- [ ] All queries can be scoped by `tenant_id` and return isolated data [ ]
- [ ] No cross-tenant references pass validation [ ]


### 8) Indexing and performance hardening
Create appropriate composite and covering indexes (conceptual; implement via SQL separately):
- [ ] `employees`: `(tenant_id, employee_code)` unique; plus `(tenant_id, email)`, `(tenant_id, department)`, `(tenant_id, role)`, `(tenant_id, team_id)` [ ]
- [ ] `shift_templates`: `(tenant_id, department)`, `(tenant_id, is_active)` [ ]
- [ ] `shift_assignments`: unique `(tenant_id, employee_id, date)`; plus `(tenant_id, date)`, `(tenant_id, template_id)`, `(tenant_id, status)` [ ]
- [ ] `time_entries`: `(tenant_id, employee_id, date)`, `(tenant_id, assignment_id)`, `(tenant_id, status)`, `(tenant_id, clock_in)` [ ]
- [ ] `leave_requests`: `(tenant_id, employee_id)`, `(tenant_id, status)`, `(tenant_id, start_date, end_date)` [ ]
- [ ] `notifications`: `(tenant_id, employee_id, is_read)` [ ]

Optional for scale:
- [ ] Partition `time_entries` by month or by tenant if volume is high [ ]
- [ ] Enable/verify autovacuum thresholds and analyze frequency for large tables [ ]

Acceptance criteria:
- [ ] P95 latency targets met on core endpoints under expected load [ ]
- [ ] Slow query log shows no recurring hot spots [ ]


### 9) Application alignment (queries, endpoints, code)
Update the application code and APIs to the canonical schema. Remove duplicates.

- Table usage
  - [ ] Replace any `employees_new` usage with `employees` [ ]
  - [ ] Replace any `shift_assignments_new` usage with `shift_assignments` [ ]
  - [ ] Replace any `time_entries_new` usage with `time_entries` [ ]
  - [ ] Remove any usage of `shift_logs` and `break_logs` [ ]
  - [ ] Replace `shifts` with `shift_templates` everywhere [ ]

- Endpoint consolidation (examples; remove duplicates)
  - [ ] Keep only one scheduling template endpoint set (backed by `shift_templates`) [ ]
  - [ ] Keep only one assignment endpoint set (backed by `shift_assignments`) [ ]
  - [ ] Keep only one time-tracking endpoint set (backed by unified `time_entries`) [ ]
  - [ ] Remove or rewrite endpoints referencing legacy tables or mixed naming [ ]

- Multi-tenant filtering
  - [ ] Ensure every read/write includes `tenant_id` in filters and inserts [ ]
  - [ ] Ensure all joins include `tenant_id` on both sides for correctness and index use [ ]

- Code quality gates
  - [ ] Static checks and lints pass [ ]
  - [ ] Unit and integration tests updated to canonical names [ ]
  - [ ] Canary deploy or staging validation successful [ ]

Acceptance criteria:
- [ ] No code references `_new`, legacy table names, or unused endpoints [ ]
- [ ] All app tests pass and CI is green [ ]


### 10) Data validation and correctness
- [ ] Sanity-check critical aggregates (e.g., headcount, recent assignments, time totals) per tenant [ ]
- [ ] Verify no orphaned child records remain after FK changes [ ]
- [ ] Verify unique constraints behave as expected under concurrent writes [ ]
- [ ] Verify pagination and date filters still perform and return correct counts [ ]


### 11) Observability and operations
- [ ] Enable slow query logging at a sensible threshold [ ]
- [ ] Add dashboards for DB CPU, connections, locks, bloat, and index usage [ ]
- [ ] Add alerts on error rates and p95/p99 latency for core APIs [ ]
- [ ] Periodic VACUUM/ANALYZE health checks documented [ ]


### 12) Security and access
- [ ] Confirm least-privilege DB roles for app and migration users [ ]
- [ ] (Optional) Add Row-Level Security by `tenant_id` for an extra guardrail [ ]
- [ ] Rotate credentials after migration if elevated access was granted [ ]


### 13) Rollback plan
Because this is destructive:
- [ ] Confirm a restorable snapshot/backup before starting [ ]
- [ ] If rollback is required, restore from snapshot and redeploy the pre-migration app version [ ]
- [ ] Document any manual data re-entry needed after restore [ ]


### 14) Ownership & timeline
- Migration owner: [ ]
- Reviewers: [ ]
- Target window: [ ]
- Staging dry-run date: [ ]
- Production date: [ ]


### 15) Appendix — legacy to canonical mapping (reference)
- `employees_new` → `employees`
- `shifts` → `shift_templates`
- `shift_assignments_new` → `shift_assignments`
- `time_entries_new` → `time_entries`
- `shift_logs` + `break_logs` → folded into `time_entries`
- `teams_new` → `teams`

Note: If any additional legacy tables are discovered during execution, add them here and handle them per Sections 5 and 6.


### 16) Final acceptance
- [ ] No legacy tables, views, or endpoints exist in production [ ]
- [ ] Canonical schema is the only schema used by the application [ ]
- [ ] Performance SLOs are met; monitoring is green [ ]
- [ ] Documentation updated (ERD, onboarding, runbooks) [ ]

---

## CURRENT PROGRESS STATUS (Updated)

### ✅ **COMPLETED PHASES:**

#### **Phase 1: Database Migration** ✅
- [x] Created destructive migration SQL script (`scripts/destructive_consolidation_migration.sql`)
- [x] Created Node.js migration runner (`scripts/run-destructive-migration.js`) 
- [x] Successfully executed database consolidation migration
- [x] Removed all `_new` suffixes from table names
- [x] Unified time tracking into single `time_entries` table
- [x] Added proper `tenant_id` columns and indexes

#### **Phase 2: Core API Endpoint Migration** ✅
- [x] Updated `lib/database.ts` to use canonical table names
- [x] Migrated all core API endpoints to new schema:
  - [x] Time tracking endpoints (`/api/time/*`)
  - [x] Shift management (`/api/shifts/*`, `/api/scheduling/*`)
  - [x] Employee management (`/api/employees/*`)
  - [x] Dashboard data endpoints
  - [x] Admin endpoints (`/api/admin/*`)
  - [x] Team lead endpoints (`/api/team-lead/*`)
  - [x] Organization and onboarding endpoints

#### **Phase 3: Frontend Alignment** ✅
- [x] Updated frontend components to use new field names:
  - [x] `clock_in_time` → `clock_in`
  - [x] `clock_out_time` → `clock_out` 
  - [x] `break_time_used` → `break_hours`
  - [x] `shift_id` → `template_id`/`assignment_id`
- [x] Updated dashboard components (`app/admin/dashboard/page.tsx`, `app/employee/dashboard/page.tsx`)

### 🔄 **CURRENT PHASE: Test Suite Fixes** (IN PROGRESS)

#### **Jest Configuration & Setup** ✅
- [x] Fixed NextResponse mocking issues (`Response.json is not a function`)
- [x] Excluded Playwright tests from Jest runs 
- [x] Excluded setup.ts from being treated as test file
- [x] Fixed Jest module mocking patterns

#### **Mock Implementation Fixes** ✅
- [x] Fixed `mockCreateApiAuthMiddleware.mockImplementation is not a function` errors
- [x] Updated all test files to use proper mock function creation pattern:
  ```typescript
  // BEFORE (broken):
  const mockFn = importedFn as jest.MockedFunction<typeof importedFn>
  
  // AFTER (working):
  const mockFn = jest.fn()
  jest.mock('@/lib/module', () => ({ importedFn: mockFn }))
  ```
- [x] Fixed 11 test files with mock implementation issues

#### **Current Test Results:**
- **Test Suites:** 12 failed, 3 passed, 15 total  
- **Individual Tests:** 42 failed, 20 passed, 62 total
- **Progress:** Improved from 43 failed/16 passed to 42 failed/20 passed

### 🔧 **REMAINING ISSUES TO FIX:**

#### **1. Team Lead Authorization Issues** 🔴
- **Problem:** Team lead API endpoints returning 403 instead of expected 200
- **Root Cause:** Jest mocks not being applied to actual API routes (module mocking not working properly)
- **Status:** Identified but not yet resolved
- **Files Affected:** 
  - `__tests__/api/team-lead/leave-requests.test.ts`
  - `__tests__/api/team-lead/swap-requests.test.ts`
  - `__tests__/api/team-lead/members.test.ts`

#### **2. Field Name Mismatches** 🟡
- **Problem:** Some tests still reference old field names in mock data
- **Status:** Partially fixed, some remain
- **Examples:** `clock_in_time` vs `clock_in`, `break_time_used` vs `break_hours`

#### **3. Database Connection Errors** 🟡
- **Problem:** Tests trying to connect to actual database instead of using mocks
- **Error:** `The server does not support SSL connections`
- **Status:** Needs investigation

### 📋 **NEXT STEPS:**

1. **Fix Jest Module Mocking:** 
   - Investigate why Jest mocks aren't being applied to API routes
   - Consider using manual mocks in `__mocks__` directory
   - Alternative: Mock at the database level instead of auth level

2. **Complete Field Name Updates:**
   - Scan remaining test files for old field names
   - Update mock data to match new schema

3. **Database Mock Issues:**
   - Ensure tests use mocked database functions instead of real connections
   - Review tenant context mocking

4. **Playwright Test Separation:**
   - Move Playwright tests to separate directory structure
   - Update Jest config to completely exclude Playwright

### 🎯 **SUCCESS CRITERIA:**
- All Jest tests passing (target: 0 failed tests)
- No database connection attempts in tests
- All API endpoints using canonical table names
- All frontend components using new field names
- Team lead authorization working correctly in tests


