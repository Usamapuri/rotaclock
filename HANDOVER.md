# RotaClock — Session Handover (2026-06-05)

Pick-up notes for the refactor. Full plan: `REFACTOR_PLAN.md`. Repo memory/audit: `CLAUDE.md`.

## TL;DR

- **Phases 0, 1, 2 are DONE and merged to `main` and PUSHED to origin** (deploying on Railway).
- **Phase 3 (tenant isolation) is ~60% done** on branch `phase-3-tenant-isolation` (NOT merged): the app-layer isolation (the security-critical part) is complete; DB-infra (RLS, schema gaps, composite FKs, isolation test) remains.

## 🔴 Do these first (owner actions)

1. **The Railway database is EMPTY** — `employees` table doesn't exist. The deployed app has no logins until you apply the schema:
   ```
   DATABASE_URL="<railway url>" npm run db:railway-reset
   ```
   This drops/recreates `public`, applies `database-schema.sql`, and seeds:
   - `admin@rotaclock.local` / `password123`  (role: admin)
   - `agent@rotaclock.local` / `password123`  (role: agent)
   Then you can log in and test. (Confirmed empty via `scripts/reset-login.js --list` → "relation employees does not exist".)
2. **ROTATE the leaked DB password — it is STILL ACTIVE.** The old cleanup scripts hardcoded
   `postgresql://postgres:QlUX…@metro.proxy.rlwy.net:36516/railway`; a connection with it just succeeded this session. It's also in git history. Rotate it in the Railway dashboard.
3. **`JWT_SECRET`** — you already set this on Railway. ✅ (Required in production; the app fails closed without it.)

## Testing the app (after step 1)

- Log in at `/login` with `admin@rotaclock.local` / `password123`.
- Reset/inspect logins anytime (reads `DATABASE_URL` from env):
  ```
  npm run db:login:list                              # list accounts + who has a password
  npm run db:reset-login admin@rotaclock.local NewPass123
  node scripts/reset-login.js --all NewPass123       # reset every active employee
  ```
  NB: the reset script only works AFTER the schema exists (step 1).

## What changed this session

**Phase 0 — stabilize** (`9763df3`): removed the two scripts that hardcoded the live DB password + ran DROP CASCADE; deleted committed garbage, 5 dead test routes, unused scheduling components; dropped broken npm scripts; added `.gitignore`/`CONTRIBUTING.md`.

**Phase 1 — 3 visible bugs** (`bac456a`): blank manager layout (wrong DashboardShell props), duplicate logout (8 leaf pages had own headers), invisible shifts (`rotas/[id]/publish` only flipped `WHERE rota_id=$1` → now adopts+publishes ad-hoc NULL-rota shifts in the rota's week) + "N drafts not yet visible" badge.

**Phase 2 — auth overhaul** (`f7b28f4`, `a09d3a2`, `78deb49`):
- Signed HS256 JWT (`lib/jwt.ts`, Web Crypto) in an httpOnly SameSite cookie (`lib/session.ts`); same-origin so existing fetches unchanged; Bearer fallback for tests.
- `createApiAuthMiddleware` verifies the session + loads user from DB (108 callers secured, no edits); added `withAuth`/`withTenant` wrappers.
- `middleware.ts` chokepoint: every `/api/*` needs a session except `auth/login`, `auth/logout`, `organizations/{signup,verify}`, `health`; coarse role gates by path.
- One `POST /api/auth/login` (deleted unified/admin/employee/team-lead-login); removed DEMO_AUTH + password123 bypass.
- Hardened reset-password (was unauth + plaintext) and verification/save-photo (was unauth auto-clock-in). Removed SQL-injection `addTenantFilter`.
- Impersonation kept but made server-authoritative (imp claim + `/api/auth/stop-impersonation`).
- `__tests__/route-auth-coverage.test.ts` — all 141 routes asserted authenticated (passing).

**Phase 3 — tenant isolation (in progress, branch `phase-3-tenant-isolation`):**
- Slice 1: `lib/database.ts` getters require `tenant_id` (`assertTenant` throws) + filter by it; fixed `getAttendanceSummary` `as` reserved-word bug. `__tests__/tenant-scoping.test.ts` passing (8 helpers fail-closed). Closed the `GET /api/shifts` leak.
- Slice 2: tenant-scoped the leak routes — `teams` (+5 subroutes), `quality-scores` (GET/POST), `onboarding/*` (8 routes). All reads/writes filter by tenant_id; `[id]` lookups add `AND tenant_id`; INSERTs stamp tenant; `step_completions` (no tenant col) isolated via `onboarding_steps` checks.
- All commits build clean; tests green.

## Remaining work

**Phase 3 (resume here, needs live DB to verify):**
- **Task 19** — add `tenant_id` column to `break_logs` and `step_completions` (+ backfill from parent rows). Both currently lack it (`database-schema.sql` lines 333, 633).
- **Task 20** — DB-enforced RLS: a `SET app.tenant_id` per-request wrapper in `lib/database.ts`; reconcile the two `current_tenant()` defs (hardcoded `'default-tenant'` in `database-schema.sql` vs `current_setting`-based in `scripts/rls_policies.sql`); drop the NULL-bypass policies; run as a non-superuser app role (the connection-string switch is a Railway action).
- **Task 21** — composite `(tenant_id, id)` FKs on tenant tables; a 2-tenant isolation integration test (seed 2 tenants, assert no endpoint returns the other's rows).
- Then merge `phase-3-tenant-isolation` → `main`.

**Then Phases 4–8** per `REFACTOR_PLAN.md`: 4 schema/migrations (real migration runner — needed by the Phase 3 SQL above), 5 API consolidation, 6 frontend refactor, 7 RotaCloud feature parity, 8 test/ops/billing.

## Branch state

- `main` = Phases 0–2 (pushed to origin).
- `phase-3-tenant-isolation` = Phase 3 slices 1–2 (off main, not merged, not pushed).
