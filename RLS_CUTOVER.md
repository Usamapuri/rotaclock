# RLS Enforcement Cutover — Railway role switch runbook

How to turn on **DB-enforced** row-level security (defense-in-depth on top of the
app-layer tenant filtering that's already live).

## ⚠️ Read this first — prerequisite, or you'll lock the app out

RLS is bypassed by superusers, so today (app connects as `postgres`) the policies
do nothing. To enforce them you must connect the app as a **non-superuser role**.
With strict RLS, any DB connection that hasn't run `SET app.tenant_id`
sees/writes nothing.

**✅ App-side prerequisites are now DONE:**
- Per-request `SET app.tenant_id`: `runWithTenantConnection` + the `dbContext`
  AsyncLocalStorage make every `query()` in a request run on one connection with
  the tenant GUC set (verified on the live DB).
- All ~131 tenant routes wrapped with `withRlsTenant` (or `withTenant`), so they
  establish that connection.
- `current_tenant()` reconciled to read the GUC (migration 005).
- Login bypass: `auth_login_candidates()` SECURITY DEFINER lookup (migration 006);
  `/api/auth/login` uses it, so login works under RLS.

**So the only remaining step is the role switch below.** It's still gated on YOU
because it requires changing the Railway `DATABASE_URL` env var. Until then the
app runs as superuser (RLS inert) and app-layer `WHERE tenant_id` filtering is
the isolation. super_admin note: super-admins have no tenant, so under RLS they
can't read tenant tables directly — platform tables (super_admins,
tenant_signup_requests) are NOT in the policy list, and per-tenant access is via
impersonation (which sets app.tenant_id).

## Steps (when the app-side work is ready)

1. **Create the app role** (run as superuser; pick a strong password, don't commit it):
   ```bash
   psql "$ADMIN_DATABASE_URL" -v app_pw="'STRONG_PASSWORD_HERE'" -f scripts/create_app_role.sql
   ```
2. **Apply the strict policies + reconciled current_tenant():**
   ```bash
   psql "$ADMIN_DATABASE_URL" -f scripts/rls_policies.sql
   ```
3. **Build the app connection string** with the new role. In Railway, the Postgres
   plugin exposes host/port/db; assemble:
   ```
   postgresql://rotaclock_app:STRONG_PASSWORD_HERE@<host>:<port>/<db>
   ```
   (Use the same host/port/db as the current `DATABASE_URL`, just swap user+password.)
4. **Switch the Railway env var:** Railway dashboard → your service → **Variables**
   → edit `DATABASE_URL` to the `rotaclock_app` connection string → **Deploy**.
   (Railway redeploys on variable change.)
5. **Verify** with the non-superuser isolation check:
   ```bash
   psql "$ADMIN_DATABASE_URL" -f scripts/verify_tenant_isolation.sql
   ```
   It seeds two tenants and asserts that, under `rotaclock_app` + a set
   `app.tenant_id`, one tenant cannot see the other's rows.
6. **Rollback if needed:** set `DATABASE_URL` back to the `postgres` string and
   redeploy; RLS becomes inert again (superuser bypass) and the app-layer
   filtering still protects tenants.

## Also outstanding (security)
- **Rotate the leaked `postgres` password** (it's in git history) — do this
  regardless of RLS.
