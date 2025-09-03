## Endpoint Consolidation Checklist (Post-DB Migration)

Purpose: Remove duplicate/legacy endpoints and align all API code to the canonical schema. Track progress with the checkboxes below.


### 1) Canonical data access (table names)
- [ ] Replace all `employees_new` references with `employees` [ ]
- [ ] Replace all `shift_assignments_new` references with `shift_assignments` [ ]
- [ ] Replace all `time_entries_new` references with `time_entries` [ ]
- [ ] Replace all `shifts` references with `shift_templates` [ ]
- [ ] Remove any usage of `shift_logs` and `break_logs` (moved to `time_entries`) [ ]


### 2) Multi-tenant query enforcement
- [ ] Ensure every SELECT/INSERT/UPDATE includes `tenant_id` (filters and writes) [ ]
- [ ] Ensure every JOIN keys on `tenant_id` on both sides (for safety and index use) [ ]
- [ ] Audit pagination endpoints to include `tenant_id` and stable ordering [ ]


### 3) Scheduling endpoints (templates and assignments)
- [ ] Keep only one set of template endpoints backed by `shift_templates` [ ]
- [ ] Keep only one set of assignment endpoints backed by `shift_assignments` [ ]
- [ ] Update create/update assignment logic to use `template_id` (not `shift_id`) [ ]
- [ ] Enforce unique `(tenant_id, employee_id, date)` when creating assignments [ ]
- [ ] Remove any legacy/stub routes under `app/api/shifts/` that target old tables [ ]


### 4) Time & attendance endpoints
- [ ] Keep only one time-tracking endpoint set backed by `time_entries` [ ]
- [ ] Remove runtime creation or usage of `shift_logs`/`break_logs` [ ]
- [ ] Ensure clock-in/out and break logic writes to `time_entries` consistently [ ]
- [ ] Update attendance and payroll reports to join via `tenant_id` and canonical tables [ ]


### 5) Employees/teams endpoints
- [ ] Align employee CRUD to `employees` and tenant-scoped indices [ ]
- [ ] Ensure team membership endpoints use `team_assignments` consistently [ ]
- [ ] Verify team lead/project manager endpoints use canonical joins and `tenant_id` [ ]


### 6) Notifications, leave, swaps
- [ ] Align `notifications` to `(tenant_id, employee_id, is_read)` indexing [ ]
- [ ] Align `leave_requests` filtering: `(tenant_id, status)` and date ranges [ ]
- [ ] Ensure `shift_swaps` are tenant-scoped and reference canonical IDs [ ]


### 7) Code cleanup and tests
- [ ] Remove dead code and unused helpers for legacy tables [ ]
- [ ] Update `lib/database.ts` to remove legacy table creation logic [ ]
- [ ] Update unit/integration tests to canonical names and tenant filters [ ]
- [ ] Run full test suite and fix any failures [ ]


### 8) Performance and observability
- [ ] Re-check slow query logs after consolidation [ ]
- [ ] Ensure indexes are used on hot endpoints (EXPLAIN/ANALYZE spot checks) [ ]
- [ ] Update dashboards/alerts for p95/p99 latency and error rates [ ]


### 9) Acceptance
- [x] No endpoints reference `_new` or legacy table names ✅
- [x] No routes create or read `shift_logs`/`break_logs` ✅
- [ ] All endpoints pass tests and meet performance targets [ ] ⚠️ **IN PROGRESS**

---

## ENDPOINT CONSOLIDATION STATUS (Updated)

### ✅ **COMPLETED WORK:**

#### **Core Database Layer** ✅
- [x] **`lib/database.ts`** - Completely refactored to use canonical tables
  - Removed all `_new` table references
  - Unified time tracking to use `time_entries` table only
  - Removed legacy functions: `createShiftLog`, `updateShiftLog`, `getShiftLogs`, `createBreakLog`, `updateBreakLog`, `getBreakLogs`

#### **Time Tracking Endpoints** ✅
- [x] **`/api/time/clock-in/route.ts`** - Uses `time_entries` table
- [x] **`/api/time/clock-out/route.ts`** - Uses `time_entries` table  
- [x] **`/api/time/break-start/route.ts`** - Uses `time_entries` table
- [x] **`/api/time/break-end/route.ts`** - Uses `time_entries` table
- [x] **`/api/time/attendance/route.ts`** - Uses `time_entries` with `shift_assignments`

#### **Shift Management Endpoints** ✅
- [x] **`/api/shifts/[id]/route.ts`** - Uses `shift_templates` and `shift_assignments`
- [x] **`/api/shifts/route.ts`** - Uses `shift_assignments` for delete checks
- [x] **`/api/shifts/assignments/route.ts`** - Uses canonical `employees` and `shift_assignments`
- [x] **`/api/shifts/[id]/verify-start/route.ts`** - Uses `shift_assignments` and `time_entries`
- [x] **`/api/shifts/[id]/start/route.ts`** - Uses `shift_assignments` and `employees`
- [x] **`/api/scheduling/assign/route.ts`** - Uses `employees` and `shift_assignments`
- [x] **`/api/scheduling/week/[date]/route.ts`** - Uses canonical tables
- [x] **`/api/scheduling/templates/route.ts`** - Uses `shift_assignments` for delete checks

#### **Employee Management Endpoints** ✅  
- [x] **`/api/employees/route.ts`** - Uses canonical `employees`, `shift_assignments`, `time_entries`
- [x] **`/api/admin/employees/route.ts`** - Uses `employees` table
- [x] **`/api/admin/employees/[id]/role/route.ts`** - Uses `employees` table

#### **Dashboard & Data Endpoints** ✅
- [x] **`/api/dashboard/data/route.ts`** - Fully migrated to canonical tables
- [x] **`/api/shift-logs/employee/route.ts`** - Converted to proxy endpoint (fetches from `time_entries`, returns in legacy format for compatibility)

#### **Admin Endpoints** ✅
- [x] **`/api/admin/shift-approvals/route.ts`** - Uses `time_entries`, `employees`, `shift_assignments`
- [x] **`/api/admin/payroll/calculate/route.ts`** - Uses `employees` and `time_entries`
- [x] **`/api/admin/impersonation/route.ts`** - Uses `employees` table
- [x] **`/api/admin/teams/route.ts`** - Uses `employees` table
- [x] **`/api/admin/teams/[id]/members/route.ts`** - Uses `employees` table
- [x] **`/api/admin/teams/[id]/assign-lead/route.ts`** - Uses `employees` table
- [x] **`/api/admin/teams/[id]/change-lead/route.ts`** - Uses `employees` table
- [x] **`/api/admin/projects/assign-manager/route.ts`** - Uses `employees` table

#### **Team Lead Endpoints** ✅
- [x] **`/api/team-lead/leave-requests/route.ts`** - Uses `employees` table
- [x] **`/api/team-lead/shifts/swap-requests/route.ts`** - Uses `employees` and `shift_assignments`
- [x] **`/api/team-lead/team/members/route.ts`** - Uses `employees` table

#### **Organization & Auth Endpoints** ✅
- [x] **`/api/organizations/signup/route.ts`** - Uses `employees` table
- [x] **`lib/api-auth.ts`** - Uses `employees` table
- [x] **`lib/tenant-middleware.ts`** - Uses `employees` table  
- [x] **`lib/notification-service.ts`** - Uses `employees` table

#### **Frontend Components** ✅
- [x] **`app/admin/dashboard/page.tsx`** - Updated field names (`clock_in`, `clock_out`, `total_hours`, `break_hours`)
- [x] **`app/employee/dashboard/page.tsx`** - Updated field names and time tracking logic
- [x] **`app/employee/timesheet/page.tsx`** - Compatible with proxied `shift-logs` endpoint

### 🔧 **CURRENT ISSUES (Test Suite):**

#### **Test Configuration** ✅ FIXED
- [x] Fixed Jest module mocking patterns
- [x] Fixed NextResponse mocking issues  
- [x] Excluded Playwright tests from Jest
- [x] Fixed `mockImplementation is not a function` errors

#### **Remaining Test Issues** ⚠️
1. **Team Lead Authorization (403 errors):**
   - Jest mocks not being applied to API routes
   - Affects team lead test files
   - Root cause: Module mocking not working properly

2. **Database Connection Errors:**
   - Tests attempting real database connections
   - Need better database function mocking

3. **Field Name Mismatches:**
   - Some test mock data still uses old field names
   - Partially fixed, some remain

### 📊 **CURRENT METRICS:**
- **API Endpoints Migrated:** ~50+ endpoints ✅
- **Database Functions Updated:** All core functions ✅  
- **Frontend Components Updated:** All major components ✅
- **Test Suites:** 12 failed, 3 passed (improving from 11 failed, 2 passed)
- **Individual Tests:** 42 failed, 20 passed (improving from 43 failed, 16 passed)

### 🎯 **FINAL STEPS TO COMPLETION:**
1. Fix Jest module mocking for team lead authorization
2. Complete field name updates in remaining test files  
3. Resolve database connection issues in tests
4. Achieve 0 failed tests
5. Performance validation on key endpoints


