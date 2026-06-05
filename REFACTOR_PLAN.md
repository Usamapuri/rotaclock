# RotaClock — Phased Refactor Plan

Status: **DRAFT** · Authored 2026-06-05 · Owner: hey@bhookly.com
Companion docs: `CLAUDE.md` (repo memory / audit findings). Read that first.

## Verdict driving this plan

Audit grades: Backend **D**, Database **D+**, Frontend **C-** → **salvageable, not a rewrite.** The schema, the centralized parameterized DB layer, the shadcn UI kit, and a correct auth+tenant route template (already used by ~half the routes) are worth keeping. The work is to (1) stop the bleeding, (2) make it secure and truly multi-tenant, (3) pay down structural debt, then (4) reach RotaCloud feature parity.

## Operating principles

- **Branch-per-phase**, small PRs, each phase independently shippable. This repo currently has uncommitted changes and committed garbage — Phase 0 fixes that first.
- **No raw SQL string-building, no `new Pool` in routes** — everything through `lib/database.ts query()`.
- **Every route authenticates AND scopes by `tenant_id`** — enforced by a wrapper, not copy-paste.
- **Frontend chrome lives only in `DashboardShell`.**
- The earlier single-tenant production instance is treated as a **separate deployment**; data there is not in scope. This repo's DB may be freely reset/migrated.
- Each phase has an **exit criteria** — don't advance until it's met.

## Assumptions (confirm or correct)

1. The already-deployed single-tenant instance stays as-is; we are NOT migrating its live data into this multi-tenant build (you said "don't worry about the data").
2. Security before features — a multi-tenant SaaS you intend to sell cannot ship with the current auth model. If your priority is a demo-able feature set first, phases 5–7 can move ahead of 2–4 at the cost of a known-insecure interim build.
3. Photo-verification clock-in is a feature you want to keep (not dead code).
4. Target deploy stays Railway + Postgres + Next.js.

---

## Phase 0 — Stabilize, clean, and make the repo safe (1–2 days)

**Goal:** a clean tree you can reason about; remove footguns before touching logic.

- Commit/stash the current working changes (5 dirty files) so we start from a known state.
- **Rotate the leaked Railway DB credentials** hardcoded in `scripts/cleanup-legacy-tables.js` and `scripts/drop-legacy-objects.js`. Then delete those two destructive scripts (or gut them to read `DATABASE_URL`).
- Delete committed garbage at repo root: `tash`, `--porcelain`, `development`, `h origin development`, `main_scheduling_page.tsx`, `scheduling-backup.json`, `Dockerfile.disabled`, `indexsample.html`, stray `fix_*.sql` at root.
- Delete dead routes: `app/api/test-verification{,-simple,-step2,-step3,-step4}`.
- Delete dead component twins after confirming no imports: `components/scheduling/{WeekGrid,ShiftCell,TemplateLibrary}.tsx` (keep the `Modern*`/`Enhanced*` set, or vice-versa — pick one and grep for importers first).
- Fix or remove broken `package.json` scripts pointing at non-existent files (`db:run-sql`, `db:fix:agents`, `db:migrate:teamlead`, `test:setup`).
- Add `.gitignore` entries and a short `CONTRIBUTING`/branch note.

**Exit criteria:** `next build` passes; `git status` clean; no secrets in tree; dead files gone; `npm run` has no dangling scripts.
**Risk:** low. **Reversible:** yes.

---

## Phase 1 — Fix the 3 visible bugs (1–2 days)

**Goal:** the app behaves correctly for the core demo flow.

- **Bug A — duplicate logout.** Remove per-page `<header>`+logout blocks from `app/employee/{timesheet,time-history,profile,onboarding}/page.tsx` and `app/admin/{timesheet,reports,employees,onboarding}/page.tsx`; rely on `DashboardShell`. Standardize all logout on `AuthService.logout()` (kill the `localStorage.removeItem("employeeId")` partials in onboarding pages).
- **Bug B — employee shifts invisible.** Unify the publish path so assigned shifts actually reach employees. Decision (recommend): make assignment carry a `rota_id` always, and make `rotas/[id]/publish` publish all shifts in the rota's week (including legacy `rota_id=null`), OR collapse to a single date-range publish. Add a clear "Draft / Published" state indicator in the admin scheduling UI so the draft→publish step is unmissable. Verify end-to-end: assign → publish → employee dashboard + scheduling show it.
- **Bug C — manager layout renders blank.** Fix `app/manager/layout.tsx` to pass `DashboardShell`'s real props (`headerLabel`, `links`, `children`) instead of the stale `title/breadcrumbs/...` shape.

**Exit criteria:** manual verification of each role's dashboard; an assigned+published shift is visible to the employee; no double logout; manager pages render content.
**Risk:** low–medium (Bug B touches the publish model — covered properly in Phase 7, this is the tactical fix).

---

## Phase 2 — Authentication & authorization overhaul (1–2 weeks) ⚠️ blocking for any real sale

**Goal:** replace the raw-UUID-as-token model with real auth, and make authorization uniform.

- Replace bearer-UUID with **signed, expiring sessions** (JWT in httpOnly cookie, or a server session table). Hash passwords with bcrypt (already a dep) everywhere; remove the `password123` / `ALLOW_DEFAULT_PASSWORD` default and the `DEMO_AUTH` hardcoded-admin backdoor.
- Collapse the 4 login endpoints (`unified-login`, `admin-login`, `employee-login`, `team-lead-login`) into **one** `auth/login` that returns role; delete the aliases.
- Introduce a single **`withAuth(roles)` + `withTenant`** route wrapper (in `lib/api-auth.ts`) that: validates the session, loads the user, resolves tenant context, and rejects on role mismatch. Return a consistent `401/403`.
- **Apply the wrapper to every route.** Audit confirmed ~40 routes have NO auth — including payroll (`admin/payroll/*`) and an unauthenticated auto-clock-in (`verification/save-photo`). Each must go behind `withAuth`.
- Add basic **rate limiting** (lib/rate-limit.ts exists — wire it to login + sensitive routes) and remove the SQL-injection-prone `addTenantFilter()` from `lib/tenant-middleware.ts`.

**Exit criteria:** no route reachable without a valid session except `auth/login`, `organizations/signup`, `health`; sessions expire; a pen-pass (the `shannon` skill) finds no trivial auth bypass; all role gates enforced.
**Risk:** high (touches every route). Mitigate with the wrapper + a route-coverage test that asserts every `route.ts` imports `withAuth`.

---

## Phase 3 — Multi-tenant isolation hardening (1 week)

**Goal:** make cross-tenant data leaks structurally impossible, not "remembered."

- Make tenant scoping **mandatory at the data-access layer**: `lib/database.ts` helpers that currently take an *optional* `tenant_id` (or none — `getShifts`, `getEmployees`, `getShift`, etc.) must **require** it and throw if missing. This closes the `GET /api/shifts` cross-tenant leak and similar.
- **RLS strategy — DECIDED: DB-enforced RLS** (defense-in-depth, owner's call 2026-06-05). Implementation:
  - Create a non-superuser app role; switch the Railway connection string / pool (`lib/database.ts`) to use it so RLS is actually enforced (superuser bypasses it).
  - `SET app.tenant_id` (via `set_config`) at the start of every request/connection checkout, derived from the authenticated session's tenant context.
  - Drop the NULL-bypass ("backward-compat") branches in `scripts/rls_policies.sql`; reconcile the two conflicting `current_tenant()` definitions (the hardcoded `'default-tenant'` one in `database-schema.sql` vs the `current_setting`-based one) into a single source of truth.
  - Keep the app-layer `WHERE tenant_id` filtering too (belt-and-suspenders) via the required tenant param + `withTenant` wrapper from Phase 2 — RLS is the safety net, not the only guard.
- Add `tenant_id` to `break_logs` and `step_completions` (current isolation gaps). Backfill.
- Convert single-column FKs on tenant tables to **composite `(tenant_id, id)` FKs** (the `rotaclock_multitenant_constraints_fix.sql` work, applied for real) so the DB refuses cross-tenant references.
- Add a **tenant-isolation test**: seed 2 tenants, assert no endpoint returns the other's rows.

**Exit criteria:** the 2-tenant isolation test passes across all read/write routes; `break_logs`/`step_completions` carry tenant_id; FKs are tenant-composite.
**Risk:** medium. **Depends on:** Phase 2 wrapper.

---

## Phase 4 — Schema & migrations consolidation (3–5 days)

**Goal:** one true schema, one ordered migration system, no drift.

- Reconcile `database-schema.sql` with what the code actually expects. Fix the known mismatches: onboarding interfaces in `lib/database.ts` vs `onboarding_steps`/`step_completions` tables; `time_entry_approvals` FK pointing at the dead `shift_logs` table.
- Decide the fate of legacy `shift_logs`/`break_logs`: either fully remove (code already redirects to `time_entries`) or formally keep. Remove the empty stub scripts (`check_employees_new_view.sql`, `remove_employees_new_view.sql`) and `_new`-table machinery.
- Stand up a **real migration runner** with a `schema_migrations` tracking table and ordered, append-only files under `scripts/migrations/NNN_*.sql`. Fold the scattered patch scripts (`20250911_*`, `enable_manager_approvals`, `fix_time_entry_approvals_fk`, constraints-fix) into numbered migrations.
- Ensure `npm run db:railway-reset` produces a DB **identical** to migrations-applied (same indexes, constraints, RLS decision from Phase 3).

**Exit criteria:** fresh DB from migrations == reset DB; `schema_migrations` tracks state; no `information_schema.columns` runtime probing left in routes (`scheduling/assign`, `week/[date]`).
**Risk:** medium.

---

## Phase 5 — API consolidation & consistency (1 week)

**Goal:** one way to do each thing; predictable contracts.

- Adopt **one response envelope** (recommend `{ success, data, error }`) via a small `lib/api-response.ts` helper; migrate routes.
- **zod on every** request body/query (currently ~37 of 151). Whitelist updatable columns in the dynamic-`setClause` helpers.
- Collapse duplicates: three shift-swap APIs (`shifts/swap-request`, `swap-requests`, `swaps`) → one; two assignment creators (`scheduling/assign` vs `shifts/assignments`) → one; leave-requests fragmented across 4 paths (`leave-requests`, `employees/leave-requests`, `admin/leave-requests`, `manager/approvals/leave-request`) → one resource with role-scoped actions.
- Fix/remove the broken `getAttendanceSummary()` (`as` reserved-word alias).
- Reconcile the `shifts` vs `rotas` vs `scheduling` route groups into a coherent model (see Phase 7 — scheduling is the domain core).

**Exit criteria:** every route returns the standard envelope; every body is zod-validated; no duplicate endpoint families remain; a route-inventory doc is generated.
**Risk:** medium (frontend callers must update in lockstep — do alongside Phase 6).

---

## Phase 6 — Frontend architecture refactor (1–2 weeks)

**Goal:** maintainable UI; kill copy-paste and mega-files.

- Introduce an **AuthContext/provider** (current user, role, tenant, impersonation) instead of ad-hoc `localStorage` reads scattered everywhere.
- Route all data fetching through `lib/api-service.ts` (currently used by 3 files; ~41 hand-roll fetch with copy-pasted `Bearer` headers). Add **React Query/SWR** for caching, loading, and error states; delete the per-page manual `loading/refreshing` booleans.
- Split mega-pages into feature components: `app/admin/employees/[id]/page.tsx` (2308 lines), `app/employee/dashboard/page.tsx` (1553), `app/admin/dashboard/page.tsx` (1494), `app/admin/timesheet/page.tsx` (1231), `app/employee/timesheet/page.tsx` (1065).
- Finish consolidating the chrome (only `DashboardShell`), remove leftover duplicate scheduling components, ensure consistent loading/empty/error states.

**Exit criteria:** no `fetch(` of `/api` outside `api-service`; no page > ~400 lines; auth read only via context; build + lint clean.
**Risk:** medium. **Depends on:** Phase 5 contracts.

---

## Phase 7 — RotaCloud workflow & feature parity (3–5 weeks)

**Goal:** match the RotaCloud loop that makes it sticky. (Refs in `CLAUDE.md`.)

Target loop: **build rota (drag templates) → Publish → auto-notify → acknowledge → clock in/out → timesheets auto-populate & flag → payroll export.**

- **Publish → notify → acknowledge:** finalize the unified publish model (Phase 1 was tactical); on publish, send notifications (email via `lib/email.ts`, in-app via `notifications`, optional push/SMS later) and add **shift acknowledgement** (employee confirms; rota shows acknowledged/not).
- **Open shifts:** unassigned published shifts that eligible staff can claim from their dashboard; manager sees claims.
- **Staff availability:** employees set when they can/can't work (`employee_availability` exists); surface it in the scheduler so managers schedule against availability.
- **Shift swaps:** staff propose, peer accepts, **manager approves** (consolidated swap API from Phase 5).
- **Leave & holiday:** approval workflow + **holiday auto-accrual** per shift worked; clashes flagged on the rota.
- **Cost control:** shift cost from pay rates; **budget caps per team/location**; live staffing-cost total while planning.
- **Time & attendance:** clock in/out (app + on-site + photo verify), **auto-flag missing clock-outs / discrepancies**, manager notification for forgotten clock-out.
- **Reporting:** hours, absence patterns, cost; **payroll export** (CSV) for a pay period.

**Exit criteria:** a manager can build → publish → notify a rota; an employee acknowledges, claims an open shift, requests a swap/leave, clocks in/out; manager approves swaps/leave; payroll export reconciles to clocked hours. Feature-parity checklist signed off against the RotaCloud list.
**Risk:** high (largest scope). Sequence by demo value: publish/notify → availability/open-shifts → swaps/leave → cost/reporting.

---

## Phase 8 — Testing, observability, billing & launch (ongoing, ~1 week to baseline)

**Goal:** confidence to sell and operate.

- Test pyramid: unit on `lib/database.ts` helpers + auth/tenant wrappers; integration on critical flows (login, assign→publish→view, clock in/out, payroll); the existing Playwright e2e revived. Wire CI (lint + build + test on PR).
- Observability: structured logging, error tracking (Sentry), health/readiness endpoints.
- **Tenant lifecycle:** signup → provision → suspend → delete (clean cascade — currently deleting a tenant hard-errors). Super-admin dashboards for usage.
- **Billing/subscriptions** (you're selling this): plan tiers, per-seat or per-tenant pricing, Stripe/local gateway — scope separately.
- Load test the scheduler with `k6` before onboarding real call centers (hundreds of employees × weekly rotas).

**Exit criteria:** green CI; a tenant can be provisioned and torn down cleanly; basic monitoring live.

---

## Suggested sequencing & rough effort

| Phase | Theme | Effort | Blocking? |
|---|---|---|---|
| 0 | Stabilize & clean | 1–2 d | yes (foundation) |
| 1 | Fix 3 visible bugs | 1–2 d | no |
| 2 | Auth overhaul | 1–2 wk | yes for sale |
| 3 | Tenant isolation | 1 wk | yes for sale |
| 4 | Schema/migrations | 3–5 d | enables 5/7 |
| 5 | API consolidation | 1 wk | pairs with 6 |
| 6 | Frontend refactor | 1–2 wk | pairs with 5 |
| 7 | Feature parity | 3–5 wk | product goal |
| 8 | Test/ops/billing | ongoing | launch gate |

**Total to a secure, parity MVP: ~8–12 weeks** of focused work. Phases 0–1 deliver an immediately better demo this week. Phases 2–3 are the non-negotiable gate before any paying tenant. 5+6 run in parallel. 7 is the bulk of product value and can start (publish/notify slice) right after 0–1 if you want demo momentum before the security pass — accepting a known-insecure interim build.

## Decisions (locked 2026-06-05)

1. **Sequencing: SECURITY-FIRST.** After Phases 0–1, do Phases 2→3 (auth + isolation) before feature work (Phase 7). No paying tenant touches the current auth model.
2. **Isolation: DB-ENFORCED RLS** (see Phase 3) — plus app-layer filtering as belt-and-suspenders.

## Still open

3. Is the existing single-tenant production instance in scope for migration later, or permanently separate? (Assumed separate.)
4. Billing model (per-seat vs per-tenant flat) — affects Phase 8 and the schema.
