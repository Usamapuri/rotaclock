# Project Manager Role — Implementation Plan

## Overview
Introduce a Project Manager (PM) role that oversees multiple teams, monitors live status and KPIs across those teams, and performs limited management actions. This plan breaks the work into small, testable steps.

## Assumptions
- DB is PostgreSQL on Railway.
- Existing roles: `admin`, `team_lead`, `employee`.
- Teams exist with `team_lead` and members.
- Team-level live status and metrics already exist (`/api/teams/[id]/live-status`, `/api/performance-metrics/team/[teamId]`).
- Auth uses `employee-login` returning role for the session (`lib/auth.ts`, `app/api/auth/employee-login/route.ts`).

## Out of Scope (for MVP)
- Payroll exports.
- Advanced WFM forecasting.
- Cross-org permissions beyond PM’s mapped teams.

---

## 1) Role Modeling
- Purpose: Add `project_manager` role alongside existing roles.
- Tasks:
  - Extend allowed roles list conceptually (no code change yet).
  - Define PM privileges: multi-team read access; limited write (later steps).
- Test:
  - Document role matrix and get sign-off internally.

## 2) DB: PM-to-Teams Mapping
- Purpose: Allow a PM to manage multiple teams (many-to-many).
- Tasks:
  - Plan a `manager_teams` table: fields (`manager_id`, `team_id`, timestamps), unique pair.
  - Keep `employees.role` check to include `project_manager`.
- Test:
  - Confirm table design supports 1 PM → many teams and many PMs → same team without duplication.

## 3) Data Seeding (Sample PM)
- Purpose: Have a real PM user and mappings to validate end-to-end.
- Tasks:
  - Choose an existing employee to become `project_manager` (or create one).
  - Map the PM to 1–3 existing teams in `manager_teams`.
- Test:
  - Verify the PM appears in `employees` with role `project_manager` and rows exist in mapping.

## 4) Auth Recognition
- Purpose: Ensure login returns the PM role and session stores it.
- Tasks:
  - Confirm `employee-login` includes `project_manager` role when applicable.
  - Ensure `AuthService` recognizes `project_manager` and can check it.
- Test:
  - Login with PM employee ID; session shows role `project_manager`.
  - Non-PM still logs in correctly with existing roles.

## 5) Routing & Guardrails
- Purpose: Add a PM area with a dedicated layout and guard pattern.
- Tasks:
  - Define routes: `/project-manager/login`, `/project-manager/dashboard`, `/project-manager/teams`, `/project-manager/live`, `/project-manager/performance`.
  - Layout guard: redirect non-PM to `/project-manager/login`.
- Test:
  - PM can access all PM pages; `team_lead`/`employee`/unauth are redirected.

## 6) Teams by Manager (Read)
- Purpose: PM can view the list of teams they oversee.
- Tasks:
  - Plan an API to fetch teams by manager (e.g., `/api/teams/by-manager?managerId=...`) using `manager_teams`.
  - Display list in `/project-manager/teams`.
- Test:
  - PM sees exactly their mapped teams; non-PM is denied or sees none.
  - Empty state works (no mapped teams).

## 7) Dashboard (MVP)
- Purpose: Provide aggregated KPIs across managed teams.
- Tasks:
  - Aggregate counts from existing team endpoints (members, online, on break).
  - Show top-level cards: total members, online, on break, simple perf aggregates.
- Test:
  - Numbers equal the sum of the PM’s teams’ values when compared manually.
  - Handles no-team case gracefully.

## 8) Live Status (Multi-team)
- Purpose: Live view of status across all PM teams.
- Tasks:
  - Reuse team-lead event stream pattern and merge streams or add a manager-scoped stream.
  - UI lists members grouped by team with status badges.
- Test:
  - When a team member’s status changes, PM live page updates within seconds.
  - Disconnections show proper reconnect controls.

## 9) Performance View (Read)
- Purpose: PM can see performance KPIs across teams.
- Tasks:
  - Use existing team performance endpoints and compute aggregates (AHT, CSAT, FCR).
  - Provide filters by team and time window (basic).
- Test:
  - Aggregates match the average/weighted average of per-team data for the selected window.

## 10) Scheduling (Read-only MVP)
- Purpose: PM can inspect schedules across their teams.
- Tasks:
  - Read shifts/assignments per team; present a consolidated calendar/table view.
  - Filters: by team, date range, role/skill (basic).
- Test:
  - Schedules visible and match admin/team-lead views; no edit controls yet.

## 11) Scheduling (Limited Actions)
- Purpose: Carefully expand PM authority (optional).
- Tasks:
  - Define allowed actions (e.g., publish shift updates, approve swaps) with guardrails.
  - Update permissions checks to ensure PM can only act on mapped teams.
- Test:
  - PM actions succeed on mapped teams and are blocked elsewhere.
  - Audit trail records PM actions.

## 12) Leave Requests (Read + Approve)
- Purpose: PM can review and approve/deny leave for their teams.
- Tasks:
  - Filter leave requests by employees in PM’s teams.
  - Approve/deny with notes; ensure adherence to coverage minima (basic validation).
- Test:
  - PM can approve/deny only for mapped teams; actions reflected in history.

## 13) Notifications (PM)
- Purpose: Notify PM about critical events (low coverage, swap requests, high absence).
- Tasks:
  - Define notification types and routing for PM recipients.
  - PM inbox panel within PM area.
- Test:
  - Trigger events generate PM notifications; read/unread toggles work.

## 14) Permissions Hardening
- Purpose: Enforce least-privilege everywhere.
- Tasks:
  - API-level checks: confirm user role and team scope on every PM endpoint/action.
  - UI: hide controls the PM is not allowed to use.
- Test:
  - Automated tests for access matrix (admin/team_lead/project_manager/employee).
  - Manual attempt to access unauthorized data returns 403/empty.

## 15) Reporting (Basic)
- Purpose: PM can export or view summaries across their teams.
- Tasks:
  - Provide date-bounded summaries (hours, attendance, swaps, leave).
  - CSV export for PM scope.
- Test:
  - Reports include only PM teams; totals reconcile with dashboard.

## 16) Observability & Audit
- Purpose: Trace PM actions and usage.
- Tasks:
  - Add structured logs for PM endpoints and UI actions.
  - Record audit entries (who, what, when, team scope).
- Test:
  - Sample PM actions appear in logs and audit store; timestamps and IDs correct.

## 17) Performance & Load (Smoke)
- Purpose: Ensure multi-team aggregation is performant.
- Tasks:
  - Test with PM having 5–10 teams; verify dashboard loads under acceptable threshold.
  - Batch/parallelize server calls where needed.
- Test:
  - P95 load times acceptable; memory and DB query counts within budget.

## 18) Rollout & Backout
- Purpose: Gradual release to PM users.
- Tasks:
  - Feature-flag PM area.
  - Backout plan: disable flag to hide PM UI/entry points.
- Test:
  - Toggle hides/shows PM features without breaking existing roles.

## 19) Documentation & Handover
- Purpose: Ensure maintainability.
- Tasks:
  - Update `README.md` and admin guides with PM role, permissions, and workflows.
  - Add runbooks for PM onboarding and common tasks.
- Test:
  - A new engineer can enable PM for a user and verify full flow using this doc.

---

## Definition of Done (MVP)
- PM can log in, access PM area, see their teams, view aggregated dashboard, view live status, and read schedules.
- All access is correctly scoped to mapped teams.
- Tests executed and passing for the steps above.