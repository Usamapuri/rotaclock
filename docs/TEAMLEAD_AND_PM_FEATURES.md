## Team Lead and Project Manager Feature Implementation Plan

This document outlines small, testable steps to extend the system so that:
- Team Leads can manage their teams, approve/deny swap and leave requests, review meeting notes (clock-out remarks), consolidate and send reports to their Project Manager, broadcast messages to their teams, and create bonus/deduction requests for Admin approval.
- Project Managers get a dashboard to view team reports, summarize them, and send project updates to client and admin.

Where possible, steps reference existing files and APIs to keep work incremental.

### Legend
- Files are referenced using repo paths like `app/team-lead/...` or `app/api/...`.
- “Scope” means server-side checks ensuring a TL/PM acts only over their team(s)/project(s).

---

## A. Team Lead Features

### A1. Prerequisites and Scope Utilities (Small, testable)
1. Add a helper to fetch the single team a Team Lead owns and its members.
   - Add in `@/lib/database.ts`:
     - `getTeamByLead(leadId: string)` → returns team record or null.
     - `getTeamMembers(teamId: string)` → returns member rows.
   - Add in `@/lib/api-auth.ts`:
     - `isTeamLead(user)` (if missing) similar to `isProjectManager`.
   - Test:
     - Write a tiny API probe `GET /api/teams/by-lead?leadId={uuid}` already exists. Verify response for a known lead.

2. Standardize role guard usage for TL endpoints.
   - Pattern used elsewhere: `createApiAuthMiddleware()` + `isTeamLead(user)`; return 401/403 when not authorized.
   - Test by calling a dummy TL-only endpoint with and without `authorization` header.

---

### A2. Team Lead – View and Manage Their Team (Members)
Goal: TL can list members, optionally add/remove members when allowed by org policy.

1. Read existing endpoints/UI:
   - APIs present: `GET /api/teams/by-lead`, `GET /api/teams/[id]/members`.
   - UI present: `app/team-lead/team/page.tsx`, `app/team-lead/dashboard/page.tsx` (loads team by lead).

2. Create TL-scoped member management endpoints (new):
   - `POST /api/team-lead/teams/[id]/members` → body: `{ employee_id }`.
   - `DELETE /api/team-lead/teams/[id]/members/[memberId]`.
   - Scope: ensure `[id]` is the TL’s team; ensure `employee_id` is active; reject duplicates.
   - DB: insert/delete from `team_assignments` and update `employees.team_id` consistently.
   - Test with `curl` and verify via `GET /api/teams/[id]/members`.

3. Wire UI:
   - Extend `app/team-lead/team/page.tsx` with an “Add Member” dialog and a remove action that calls the APIs above.
   - Test by adding/removing a known employee and refreshing the page.

---

### A3. Swap Requests – Approve/Deny by Team Lead
Goal: TL can manage swap requests for their team members.

1. Review existing swap APIs:
   - `POST /api/shifts/swap-requests` and `GET /api/shifts/swap-requests` exist.
   - `PATCH /api/shifts/swap-requests/[id]` currently allows only Admin.

2. Implement TL-scoped approval:
   - Option A (recommended): add TL branch in `PATCH /api/shifts/swap-requests/[id]` to allow TL when both requester/target belong to the TL’s team (use `getTeamByLead` + membership check).
   - Option B: create TL wrapper `PATCH /api/team-lead/shifts/swap-requests/[id]` that calls into a shared service and enforces scope.
   - On approval, update `shift_swaps.status` and trigger any downstream changes/notifications already used by Admin.
   - Test: Create a swap request between two members of the TL’s team, approve/deny as TL, verify updated status via `GET`.

3. UI:
   - Add a small “Swap Requests” panel to `app/team-lead/team/page.tsx` or a new `app/team-lead/scheduling/page.tsx` listing pending requests with Approve/Deny buttons.
   - Test from UI end-to-end.

---

### A4. Leave Requests – Approve/Deny by Team Lead
Goal: TL can approve/reject leave for their team members.

1. Review existing endpoints:
   - `app/api/employees/leave-requests` and `app/api/employees/leave-requests/[id]` exist.

2. Add TL scope branch to `PUT /api/employees/leave-requests/[id]`:
   - Allow when the request’s `employee_id` belongs to the TL’s team.
   - Add `approved_by` (TL id) and optional `admin_notes`/`lead_notes` columns if helpful.
   - Test via PUT with TL `authorization` header.

3. UI:
   - Add a “Leave Requests” panel under TL (e.g., new `app/team-lead/requests/page.tsx`) to list pending leave for their team with Approve/Reject.
   - Test end-to-end.

---

### A5. Meeting Notes (Clock-out Remarks) – Review and Consolidate
Goal: TL reviews clock-out remarks (`shift_remarks`) and sends a consolidated report to PM.

1. Existing data:
   - `POST /api/time/clock-out` already accepts `shift_remarks`, `performance_rating` and updates `shift_logs`.

2. Add endpoints for TL reporting:
   - `GET /api/team-lead/meeting-notes?start=YYYY-MM-DD&end=YYYY-MM-DD` → returns `shift_logs` for TL’s team with `shift_remarks`, `total_calls_taken`, etc.
   - `POST /api/team-lead/reports/send` → body: `{ start, end, summary, include_raw?: boolean }`. Creates a “team report” record and notifies the PM(s) of the associated project(s).
   - Minimal schema (if desired): add `team_reports` table with `id, team_id, lead_id, start_date, end_date, summary, payload_json, sent_to, created_at`.
   - Test: seed a few `shift_logs` with remarks → fetch via GET → send via POST and verify notification in DB/logs.

3. UI:
   - Extend `app/team-lead/reports/page.tsx` to:
     - Date-range filter
     - Table of notes with export CSV
     - “Generate & Send Summary to PM” button (calls POST above)
   - Test flow.

---

### A6. Broadcast Messages to Team
Goal: TL broadcasts to their team only.

1. Add wrapper endpoint:
   - `POST /api/team-lead/broadcast` → body: `{ message }`.
   - Server resolves recipient IDs as all active employees in TL’s team, then delegates to existing `sendBroadcastMessage` in `@/lib/notification-service.ts`.
   - Test: send, verify notifications count equals team size.

2. UI:
   - Use/extend `app/team-lead/communications/page.tsx` with a textarea and “Send to Team” action.
   - Test end-to-end.

---

### A7. Bonus/Deduction Requests (TL → Admin Approval)
Goal: TL can propose payroll adjustments for Admin to approve.

1. Schema (new): `payroll_adjustment_requests`
   - Columns: `id, employee_id, team_id, created_by_lead_id, type ('bonus'|'deduction'), amount NUMERIC(12,2), reason TEXT, status ('pending'|'approved'|'rejected'), approved_by, approved_at, created_at, updated_at`.
   - Migration: add script in `scripts/` and run against Railway.

2. Endpoints:
   - TL create/list: `POST /api/team-lead/payroll/adjustments`, `GET /api/team-lead/payroll/adjustments?status=pending` (scoped to TL team).
   - Admin approve: `PUT /api/admin/payroll/adjustments/[id]` → sets status and, if approved, writes into existing `bonuses`/`deductions` tables via the established Admin payroll endpoints.
   - Test each with `curl` and via Admin UI later.

3. UI (TL):
   - Add a light UI into TL (new page `app/team-lead/payroll/page.tsx`) to submit and track requests.

---

## B. Project Manager – Team Reports Dashboard and Updates

### B1. Aggregate Team Reports for PM
Goal: PM can view reports submitted by TLs and overall notes/metrics for their projects.

1. Endpoints (PM scoped):
   - `GET /api/project-manager/reports/team-notes?project_id=...&start=...&end=...` → returns consolidated notes for all teams assigned to the project(s) the PM manages. Aggregates from `shift_logs` and `team_reports`.
   - `GET /api/project-manager/reports/summary?start=...&end=...` → returns summarized KPI (members, attendance, avg performance rating, top issues).
   - Test with a PM user header and seeded data.

2. UI:
   - Extend `app/project-manager/performance/page.tsx` or create `app/project-manager/reports/page.tsx` to:
     - Date-range filter
     - Cards of KPIs (teams covered, members, avg rating)
     - Table of TL summaries & quick links to raw notes
     - “Send Update to Client/Admin” button

3. Send Updates to Client/Admin
   - Endpoint: `POST /api/project-manager/reports/send-update` → body `{ start, end, summary, recipients: ('client'|'admin'|'both') }`.
   - Implementation can reuse `@/lib/notification-service.ts` or integrate email provider later.
   - Test: call endpoint and verify notifications created.

---

## C. Security & Authorization

1. Reuse `createApiAuthMiddleware()` everywhere. Enforce:
   - TL can only operate on their single team and its members.
   - PM can only operate on teams/projects they manage (reuse `manager_teams` / `manager_projects`).
2. Log all approvals/denials with `approved_by`, timestamps, and optional notes.
3. Return 401/403 consistently; never trust client-provided IDs without scope verification.

---

## D. Step-by-Step Testing Checklist (Each step is small)

1. TL scope utilities working:
   - Call `GET /api/teams/by-lead?leadId={TL_ID}`; expect exactly one team.
2. TL members:
   - `POST /api/team-lead/teams/{teamId}/members` then `GET /api/teams/{teamId}/members`.
3. TL swap approvals:
   - Create swap via existing POST as two team members; `PATCH /api/shifts/swap-requests/{id}` as TL; verify status.
4. TL leave approvals:
   - Create leave request (employee); approve as TL with `PUT /api/employees/leave-requests/{id}`; verify status and approver fields.
5. TL meeting notes:
   - Clock-out with remarks; `GET /api/team-lead/meeting-notes?...`; `POST /api/team-lead/reports/send` and verify a PM receives notification.
6. TL broadcast:
   - `POST /api/team-lead/broadcast` with a message; verify team member notifications.
7. TL payroll adjustment request:
   - `POST /api/team-lead/payroll/adjustments`; view as Admin; `PUT /api/admin/payroll/adjustments/{id}` approve; ensure bonus/deduction recorded.
8. PM dashboard:
   - `GET /api/project-manager/reports/summary` and `.../team-notes` with PM header; verify only their scope data.
   - In UI, send an update to client/admin and verify notification delivery.

---

## E. Rollout Plan

1. Land TL members (A2) and broadcast (A6) first – low risk, high value.
2. Add TL swap/leave approvals (A3/A4) – moderate risk; keep audit logs.
3. Introduce meeting notes consolidation (A5) – read-only plus a reporting endpoint.
4. Add payroll adjustment requests (A7) – schema migration gated behind feature flag.
5. Finish PM reports (B1) – purely aggregations + notifications.

---

## F. Notes & Pointers in the Current Codebase

- Team Lead area (present): `app/team-lead/*` (dashboard, team, live, performance, communications, reports).
- Team Lead related APIs (present): see `docs/teamlead-apis.md` and `/api/teams/by-lead`, `/api/teams/[id]/members`, `performance-metrics`, `quality-scores`.
- Swap/Leave APIs (present): `/api/shifts/swap-requests*`, `/api/leave-requests*`, `/api/employees/leave-requests*`.
- Clock-out meeting notes: `/api/time/clock-out` updates `shift_logs` with `shift_remarks`.
- Broadcast: `/api/notifications/broadcast` and `@/lib/notification-service.ts`.
- PM area: `app/project-manager/*` with scaffolding for performance and projects/teams.

---

## G. Open Questions (let me know to finalize)

1. Should Team Leads be allowed to add/remove members, or only view? (Plan supports both; we can restrict to view-only by omitting A2 APIs.)
2. For “send to client”, do we have an email provider or should we start with in-app notifications only?
3. For payroll requests, do we need multi-level approval (PM review first, then Admin), or is Admin-only approval sufficient?
4. Any specific reporting KPIs the PM dashboard must include (beyond remarks, attendance, and performance rating)?

---

This plan is incremental. Each subsection can be developed, reviewed, and deployed independently with clear tests.

---

## H. Unit Testing Strategy

### H1. Backend API Testing
For each new endpoint, create test files in `__tests__/api/`:

```typescript
// Example: __tests__/api/team-lead-members.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { createMocks } from 'node-mocks-http'
import { POST, DELETE } from '@/app/api/team-lead/teams/[id]/members/route'

describe('/api/team-lead/teams/[id]/members', () => {
  beforeEach(async () => {
    // Setup test database with known TL, team, and employees
    await setupTestData()
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  it('POST should add member to TL team', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { employee_id: 'test-employee-id' },
      headers: { authorization: 'Bearer test-tl-id' }
    })

    await POST(req, { params: Promise.resolve({ id: 'test-team-id' }) })

    expect(res._getStatusCode()).toBe(201)
    // Verify member added to team_assignments
    // Verify employee.team_id updated
  })

  it('should reject unauthorized access', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { employee_id: 'test-employee-id' }
      // No authorization header
    })

    await POST(req, { params: Promise.resolve({ id: 'test-team-id' }) })

    expect(res._getStatusCode()).toBe(401)
  })

  it('should reject adding member to wrong team', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { employee_id: 'test-employee-id' },
      headers: { authorization: 'Bearer test-tl-id' }
    })

    await POST(req, { params: Promise.resolve({ id: 'wrong-team-id' }) })

    expect(res._getStatusCode()).toBe(403)
  })
})
```

### H2. Frontend Component Testing
For each new component, create test files in `__tests__/components/`:

```typescript
// Example: __tests__/components/team-lead-member-management.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamLeadMemberManagement } from '@/components/team-lead-member-management'
import { AuthService } from '@/lib/auth'

// Mock dependencies
jest.mock('@/lib/auth')
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() })
}))

describe('TeamLeadMemberManagement', () => {
  beforeEach(() => {
    AuthService.getCurrentUser.mockReturnValue({
      id: 'test-tl-id',
      role: 'team_lead'
    })
  })

  it('should display team members', async () => {
    render(<TeamLeadMemberManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })
  })

  it('should open add member dialog', async () => {
    render(<TeamLeadMemberManagement />)
    
    fireEvent.click(screen.getByText('Add Member'))
    
    expect(screen.getByText('Add Team Member')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Select employee')).toBeInTheDocument()
  })

  it('should remove member when confirmed', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    render(<TeamLeadMemberManagement />)
    
    await waitFor(() => {
      fireEvent.click(screen.getAllByText('Remove')[0])
    })
    
    fireEvent.click(screen.getByText('Confirm'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/team-lead/teams/test-team-id/members/test-employee-id',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
```

### H3. Integration Testing
Create end-to-end tests in `__tests__/integration/`:

```typescript
// Example: __tests__/integration/team-lead-workflow.test.ts
import { test, expect } from '@playwright/test'

test.describe('Team Lead Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as team lead
    await page.goto('/team-lead/login')
    await page.fill('[data-testid="employee-id"]', 'TL001')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/team-lead/dashboard')
  })

  test('should manage team members', async ({ page }) => {
    await page.goto('/team-lead/team')
    
    // Add member
    await page.click('[data-testid="add-member-button"]')
    await page.selectOption('[data-testid="employee-select"]', 'EMP005')
    await page.click('[data-testid="add-button"]')
    
    await expect(page.locator('text=EMP005')).toBeVisible()
    
    // Remove member
    await page.click('[data-testid="remove-member-EMP005"]')
    await page.click('[data-testid="confirm-remove"]')
    
    await expect(page.locator('text=EMP005')).not.toBeVisible()
  })

  test('should approve swap requests', async ({ page }) => {
    await page.goto('/team-lead/scheduling')
    
    await page.click('[data-testid="approve-swap-swap-001"]')
    await page.fill('[data-testid="approval-notes"]', 'Approved by TL')
    await page.click('[data-testid="confirm-approve"]')
    
    await expect(page.locator('[data-testid="swap-status-swap-001"]')).toHaveText('approved')
  })
})
```

### H4. Database Testing
Create database utility functions for testing:

```typescript
// __tests__/utils/test-database.ts
import { query } from '@/lib/database'

export async function setupTestData() {
  // Create test team lead
  await query(`
    INSERT INTO employees (id, employee_id, first_name, last_name, email, role, is_active)
    VALUES ('test-tl-id', 'TL001', 'Test', 'Lead', 'tl@test.com', 'team_lead', true)
  `)
  
  // Create test team
  await query(`
    INSERT INTO teams (id, name, department, team_lead_id, is_active)
    VALUES ('test-team-id', 'Test Team', 'Test Dept', 'test-tl-id', true)
  `)
  
  // Create test employees
  await query(`
    INSERT INTO employees (id, employee_id, first_name, last_name, email, role, is_active)
    VALUES 
      ('test-employee-1', 'EMP001', 'John', 'Doe', 'john@test.com', 'employee', true),
      ('test-employee-2', 'EMP002', 'Jane', 'Smith', 'jane@test.com', 'employee', true)
  `)
}

export async function cleanupTestData() {
  await query('DELETE FROM team_assignments WHERE team_id = $1', ['test-team-id'])
  await query('DELETE FROM employees WHERE id IN ($1, $2, $3)', 
    ['test-tl-id', 'test-employee-1', 'test-employee-2'])
  await query('DELETE FROM teams WHERE id = $1', ['test-team-id'])
}
```

### H5. Test Configuration
Add to `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

---

## I. Continuation Guide for New Chat Sessions

If you lose chat connection or start a new session, use this guide to continue development:

### I1. Current Implementation Status
- **Last Completed**: Team creation fix and email-based transfer
- **Next Priority**: Team Lead member management (A2 from plan)
- **Current Branch**: `main` (all changes pushed)

### I2. Quick Setup Commands
```bash
# Clone and setup
git clone https://github.com/Usamapuri/rotacloud.git
cd rotacloud
npm install

# Start development
npm run dev

# Run tests (after implementing)
npm test
npm run test:integration
```

### I3. Database Connection
- **Railway PostgreSQL**: `postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway`
- **Test Data**: Use scripts in `scripts/` folder to seed test data

### I4. Key Files to Reference
- **Implementation Plan**: `docs/TEAMLEAD_AND_PM_FEATURES.md`
- **Team Lead APIs**: `docs/teamlead-apis.md`
- **Current Team Lead UI**: `app/team-lead/`
- **Current APIs**: `app/api/teams/`, `app/api/shifts/`, `app/api/leave-requests/`

### I5. Next Steps Checklist
1. **A1 - Prerequisites**: Add `isTeamLead()` to `lib/api-auth.ts` and database helpers
2. **A2 - Member Management**: Create `POST/DELETE /api/team-lead/teams/[id]/members`
3. **A2 - UI**: Extend `app/team-lead/team/page.tsx` with add/remove functionality
4. **Testing**: Create test files for each component
5. **Deploy**: Push changes and test on Vercel

### I6. Testing Commands
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testPathPattern=team-lead
npm test -- --testPathPattern=api

# Run integration tests
npm run test:integration

# Run with coverage
npm test -- --coverage
```

### I7. Deployment Checklist
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Database migrations applied
- [ ] Feature tested locally
- [ ] Push to GitHub (triggers Vercel deployment)
- [ ] Verify on production: `https://rotacloud.vercel.app`

### I8. Common Issues & Solutions
- **Build fails**: Check TypeScript errors with `npm run build`
- **Database connection**: Verify `DATABASE_URL` in Vercel environment
- **Tests failing**: Ensure test database is seeded with `npm run test:setup`
- **UI not updating**: Clear browser cache or check for JavaScript errors

### I9. Development Workflow
1. Create feature branch: `git checkout -b feature/team-lead-member-management`
2. Implement feature with tests
3. Run tests: `npm test`
4. Test locally: `npm run dev`
5. Commit: `git commit -m "Add team lead member management"`
6. Push: `git push origin feature/team-lead-member-management`
7. Create PR and merge to main
8. Deploy automatically via Vercel

---

This continuation guide ensures smooth development even across different chat sessions.
