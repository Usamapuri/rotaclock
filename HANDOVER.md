# RotaClock — Session Handover (2026-06-05)

Pick-up notes for the refactor. Full plan: `REFACTOR_PLAN.md`. Repo memory/audit: `CLAUDE.md`.

## TL;DR

- **Phases 0, 1, 2 are DONE and merged to `main` and PUSHED to origin** (deploying on Railway).
- **Phase 3 (tenant isolation) is ~60% done** on branch `phase-3-tenant-isolation` (NOT merged): the app-layer isolation (the security-critical part) is complete; DB-infra (RLS, schema gaps, composite FKs, isolation test) remains.

## 🔴 Do these first (owner actions)

1. **DB is now seeded** ✅ — `db:railway-reset` was run (after fixing a comment-aware
   bug in the SQL splitter). Logins live: `admin@rotaclock.local` / `password123`
   (admin) and `agent@rotaclock.local` / `password123` (agent). Tenant `rotaclock-main`.
   Use `npm run db:login:list` / `npm run db:reset-login <email> <pw>` to manage.
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

**Phase 3 (resume here):**
- **Task 19 — DONE.** `tenant_id` added to `break_logs` + `step_completions` (schema + idempotent `scripts/migrations/002_*.sql`, applied to Railway; backfill from parents). `step_completions` writer stamps tenant_id. break_logs is legacy (writes go to time_entries).
- **Task 20 — SQL groundwork DONE; CUTOVER GATED.** Reconciled `current_tenant()` to one `current_setting('app.tenant_id')` source; made `scripts/rls_policies.sql` strict (no NULL-bypass). NOT applied to live DB. The cutover (documented in the rls_policies.sql header) still needs, together: (a) non-superuser Railway DB role [owner action — superuser bypasses RLS], (b) per-request `SET app.tenant_id` in `lib/database.ts` (needs request-scoped connections, e.g. AsyncLocalStorage — superuser makes this inert today so it's unbuilt), (c) a SECURITY DEFINER / BYPASSRLS exception for the LOGIN path (it looks up users by email before a tenant is known — strict RLS would otherwise lock everyone out). Do NOT apply strict RLS without all three or the app locks out.
- **Task 21 — TODO.** Composite `(tenant_id, id)` FKs on tenant tables (some uniques exist already, see `database-schema.sql`); a 2-tenant isolation test — `scripts/verify_tenant_isolation.sql` is a rough SQL starting point (uses a `rotaclock_verifier` non-superuser role + `set_config`), but needs the RLS cutover to be meaningful. App-level isolation is already covered by Slices 1–2 + the `tenant-scoping` Jest test.
- Then merge `phase-3-tenant-isolation` → `main`.

**Note:** app-layer tenant isolation (the real protection) is DONE and tested. The remaining RLS/FK work is defense-in-depth gated on the non-superuser DB role.

**Then Phases 4–8** per `REFACTOR_PLAN.md`: 4 schema/migrations (real migration runner — needed by the Phase 3 SQL above), 5 API consolidation, 6 frontend refactor, 7 RotaCloud feature parity, 8 test/ops/billing.

## Branch state

- `main` = Phases 0–2 (pushed to origin).
- `phase-3-tenant-isolation` = Phase 3 slices 1–2 (off main, not merged, not pushed).
