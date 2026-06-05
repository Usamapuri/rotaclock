# CLAUDE.md — RotaClock

Repository memory for Claude Code. Keep this file current as the codebase changes.

## What this is

**RotaClock** — a multi-tenant SaaS clone of [RotaCloud](https://rotacloud.com) (UK staff-scheduling / rota / time-&-attendance software), targeted at call centers in Pakistan to undercut RotaCloud on price. One **single-tenant** instance of an earlier version is already deployed in production; **this** repo is the rebuilt **multi-tenant + super-admin** version.

Built ~6–7 months ago largely with Cursor auto/composer. Treat as a first-draft codebase with known structural debt (see Audit Verdict). **No production data in this repo's DB matters — fallbacks/migrations may freely alter schema.**

## Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **Tailwind + Radix/shadcn** (`components/ui/*` are shadcn primitives — generally fine, don't deep-review)
- **Postgres** via raw `node-pg` (`pg`), all access centralized in `lib/database.ts` (`query()` helper, parameterized). No ORM.
- **zod** for validation (used in ~37 routes only)
- Deployed on **Railway**. Build via `next build`; `railway.toml`, `Dockerfile`.
- Tests: Jest (`__tests__/`, `tests/`) + Playwright (`test:integration`). Many `db:*` npm scripts point at **non-existent files** (see Hazards).

## Roles

`super-admin` (platform owner) → `admin` (tenant owner) → `manager` (location-scoped) → `employee`. Pages under `app/{super-admin,admin,manager,employee}/*`.

## Architecture map

- **Auth (rebuilt in Phase 2 — signed sessions):** login (`POST /api/auth/login`, the single login for all roles) bcrypt-verifies and issues a **signed HS256 JWT** (`lib/jwt.ts`, Web Crypto, dependency-free) in an **httpOnly + SameSite=Lax cookie** (`rotaclock_session`, `lib/session.ts`; Secure in prod). Same-origin, so the browser sends it automatically — client fetches need no change; a `Authorization: Bearer <jwt>` header is also accepted (tests/API clients). `lib/api-auth.ts` `createApiAuthMiddleware()` verifies the session and loads the user fresh from the DB (respects deactivation/role change); also exports `withAuth(roles)`/`withTenant(roles)` wrappers (preferred for new routes). `middleware.ts` is a chokepoint: every `/api/*` requires a valid session except `auth/login`, `auth/logout`, `organizations/{signup,verify}`, `health`, plus coarse role gates by path prefix (`/api/super-admin` → super_admin, `/api/admin` → admin+super_admin, `/api/manager` → manager+admin+super_admin). Backdoors removed (no `DEMO_AUTH`, no `password123`/`ALLOW_DEFAULT_PASSWORD`). Impersonation is server-authoritative via an `imp` claim (start sets an impersonation cookie; `POST /api/auth/stop-impersonation` restores). `lib/auth.ts` `AuthService` is now display-state only (localStorage holds the non-secret user object; the cookie is the credential). **`JWT_SECRET` (>=16 chars) MUST be set in production** — the app falls back to a fixed dev-only secret when `NODE_ENV !== 'production'`.
- **Multi-tenancy:** shared-schema, shared-DB, discriminator column `tenant_id VARCHAR(80)` (a slug like `rotaclock-main`, NOT the org UUID). `employees` has both `tenant_id` AND `organization_id` (UUID FK) — dual-key, drift-prone. Isolation is **application-layer only**: hand-written `WHERE tenant_id = $n` per route. RLS is defined (`scripts/rls_policies.sql`) but **completely inert** (app never `SET`s `app.tenant_id`, app connects as superuser, NULL-bypass policies). Tenant context resolved server-side via `lib/tenant.ts` → `lib/tenant-middleware.ts` `getTenantContext(userId)`.
- **Frontend state:** no context/provider. Current user/tenant live in **localStorage**, read ad-hoc via `AuthService.getCurrentUser()`. Client-only SPA — nearly every page is `"use client"` + `useEffect`+`fetch`. No SWR/React-Query, no RSC data fetching.
- **API service layer:** `lib/api-service.ts` (650 lines) exists but is imported by only **3 files**; the other ~41 pages hand-roll `fetch` with copy-pasted `Bearer ${user.id}` headers (29 files). Effectively dead.
- **Canonical schema:** `database-schema.sql` (repo root, ~1134 lines, "single source of truth"). Plus a graveyard of overlapping ad-hoc patch scripts in `scripts/`.
- **Fresh DB:** `npm run db:railway-reset` → `scripts/db-railway-reset.js` (drops `public`, applies `database-schema.sql` statement-by-statement, seeds `scripts/db-seed-railway.sql`: org `rotaclock-main`, admin/agent, password `password123`). Does NOT apply RLS or constraint-fix scripts.

## Domain model (core tables)

`organizations` (tenant root) · `employees` (users) · `locations` · `teams` · `projects` · `shift_templates` · `rotas` (weekly container, has publish) · `shift_assignments` (the actual assigned shifts; `is_published` gate, optional `rota_id`) · `time_entries` (LIVE timesheet/clock data) · `shift_logs`/`break_logs` (LEGACY timesheet — superseded by `time_entries`, code redirects writes there) · `leave_requests` · `shift_swaps` · `notifications` · payroll suite (`payroll_periods/records/bonuses/deductions`, `employee_salaries`, `pay_periods`) · `performance_metrics`/`quality_scores` · onboarding suite · `verification_logs`/`shift_verifications` (photo clock-in verification). Platform: `super_admins`, `tenant_signup_requests`, `platform_audit_logs`.

## RotaCloud — target workflow (what we're cloning)

Ideal flow to match: **Manager builds rota (drag shift templates onto employees/days) → clicks Publish → staff notified (email/push/SMS) → employees see & acknowledge shifts → clock in/out (app or on-site, optional photo verify) → timesheets auto-populate, discrepancies flagged → payroll export.** Plus: **staff availability** input, **leave/holiday management** with auto-accrual, **shift swaps** (staff propose, manager approves), **open shifts** (unassigned, staff claim from phone), **cost control** (budget caps, staffing cost as you plan), **reporting** (absence patterns, hours). Refs: rotacloud.com/rota-planning, /features/sharing-rotas, help.rotacloud.com.

## KNOWN BUGS (all three FIXED in Phase 1, branch phase-1-bugfixes)

1. **Duplicate logout button.** `components/layouts/DashboardShell.tsx:109-112` renders a logout in the shared chrome, AND several leaf pages render their own header+logout while nested inside the shell: `app/employee/{timesheet,time-history,profile,onboarding}/page.tsx`, `app/admin/{timesheet,reports,employees,onboarding}/page.tsx`. Fix: delete the per-page headers; rely on the shell. (Onboarding pages also use a stale partial logout `localStorage.removeItem("employeeId")` instead of `AuthService.logout()`.)
2. **Employee shifts not showing.** Assignments are created as drafts: `app/api/scheduling/assign/route.ts:142-143` hard-codes `isPublished=false` and allows `rota_id=null`. Employee read path (`/api/scheduling/week/[date]?published_only=true`) filters `AND sa.is_published=true`. Two divergent publish paths: `app/api/rotas/[id]/publish/route.ts` only flips `WHERE rota_id=$1` (MISSES null-rota shifts) vs `app/api/scheduling/publish/route.ts` flips by date range. Admin who assigns ad-hoc shifts + clicks "Publish Rota" publishes nothing → employee never sees them. **This is the most likely real-world trigger.**
3. **Manager layout renders empty.** `app/manager/layout.tsx:65-73` passes `title/breadcrumbs/userRole/isImpersonating` to `DashboardShell`, but the shell's signature is `{ headerLabel, links, children }` and **no `children` is passed** → manager pages render a blank shell. One-line prop fix.

## HAZARDS / GOTCHAS

- **Security:** authentication was overhauled in Phase 2 (see Auth above) — raw-UUID auth, the demo/default-password backdoors, and the ~40 unauthenticated routes are all fixed; every route now authenticates (asserted by `__tests__/route-auth-coverage.test.ts`). **Still open (Phase 3 — tenant isolation):** cross-tenant data leaks where a route authenticates but doesn't scope by tenant — `app/api/teams`, `app/api/quality-scores`, `GET /api/shifts` (helper `getShifts` drops the tenant filter), the `onboarding/*` group. The newly-authenticated routes were given authn (+ coarse role gates) but NOT tenant scoping yet.
- **Broken SQL:** `lib/database.ts getAttendanceSummary()` — aliases a table as `as` (reserved word), almost certainly broken at runtime. (The SQL-injection-prone `addTenantFilter()` in `lib/tenant-middleware.ts` was removed in Phase 2.)
- **Schema drift:** code defensively probes `information_schema.columns` at request time (`scheduling/assign`, `week/[date]`) for `override_*` columns. `lib/database.ts` onboarding interfaces describe a DIFFERENT schema than `database-schema.sql`. `time_entry_approvals` FK points at the dead `shift_logs` table. Tables `break_logs` and `step_completions` lack `tenant_id` (isolation gap). `team_*` tables are dropped by some scripts and recreated by others — existence depends on run order.
- **Dangerous scripts:** `scripts/cleanup-legacy-tables.js` and `scripts/drop-legacy-objects.js` **hardcode a live Railway production connection string with credentials** and run destructive `DROP ... CASCADE`. Do not run blindly.
- **Broken npm scripts:** `db:run-sql`, `db:fix:agents` (→ missing `scripts/run-sql-file.js`), `db:migrate:teamlead` (→ missing `scripts/run-teamlead-migrations.js`), `test:setup` (→ missing `scripts/setup-test-database.js`). No real migration runner — no migrations table, no ordering. `scripts/migrations/` has exactly 1 file.
- **Repo hygiene:** committed garbage at repo root from botched shell redirects — `tash`, `--porcelain`, `development`, `h origin development`, `main_scheduling_page.tsx` (contains literal git merge text), `scheduling-backup.json`, `Dockerfile.disabled`, `fix_*.sql`. Safe to delete.

## DEAD / DUPLICATE code (cleanup candidates)

- Routes: `app/api/test-verification{,-simple,-step2,-step3,-step4}` (5 throwaway test routes). Login aliases `auth/{admin,employee,team-lead}-login` (superseded by `auth/unified-login`). Three parallel shift-swap APIs: `shifts/swap-request`, `shifts/swap-requests`, `shifts/swaps`. Two assignment creators: `scheduling/assign` vs `shifts/assignments`. Legacy `shift-logs/*`, `break-logs/*`. Leave-requests fragmented across 4 paths.
- Components: `components/scheduling/` has old/new pairs — `WeekGrid` vs `ModernWeekGrid`, `ShiftCell` vs `ModernShiftCell`, `TemplateLibrary` vs `EnhancedTemplateLibrary`.
- Giant page files (split candidates): `app/admin/employees/[id]/page.tsx` (2308 lines), `app/employee/dashboard/page.tsx` (1553), `app/admin/dashboard/page.tsx` (1494), `app/admin/timesheet/page.tsx` (1231), `app/employee/timesheet/page.tsx` (1065).

## AUDIT VERDICT (2026-06-05)

Backend **D** · Database **D+** · Frontend **C-** → **SALVAGEABLE, not a rewrite.** Bones are sound (centralized parameterized DB layer, a real canonical schema with tenant-scoped composite uniques, shadcn primitives, a correct auth+tenant route template that ~half the routes already follow, deterministic reset/seed). The damage is concentrated and fixable: insecure auth model, inconsistent/absent authorization, inert RLS + leak-prone manual tenant filtering, schema drift, and dead/duplicate code. Remediation is weeks of focused work, not a ground-up rebuild.

## Refactor plan & locked decisions

Full phased plan: **`REFACTOR_PLAN.md`** (repo root). Phases 0–8. Locked decisions (2026-06-05):
- **Security-first sequencing:** after quick wins (Phases 0–1), do auth overhaul + tenant isolation (Phases 2–3) BEFORE feature work (Phase 7).
- **DB-enforced RLS** for tenant isolation (non-superuser app role, `SET app.tenant_id` per request, drop NULL-bypass policies) PLUS app-layer `WHERE tenant_id` as belt-and-suspenders.

## Conventions to follow when working here

- All DB access through `lib/database.ts` `query()` with `$n` params — never build SQL by string concatenation, never `new Pool` in routes.
- New routes MUST: authenticate via the `lib/api-auth.ts` middleware AND scope every query by `tenant_id`. Prefer fixing this with a single `withAuth(role)`/`withTenant` wrapper rather than copy-paste.
- Frontend chrome (header/sidebar/logout) belongs ONLY in `components/layouts/DashboardShell.tsx`. Don't add per-page headers.
- Convert relative dates to absolute when noting anything time-bound.
