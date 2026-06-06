# RLS Enforcement Cutover — Railway role switch runbook

How to turn on **DB-enforced** row-level security (defense-in-depth on top of the
app-layer tenant filtering that's already live).

## ⚠️ Read this first — prerequisite, or you'll lock the app out

RLS is bypassed by superusers, so today (app connects as `postgres`) the policies
do nothing. To enforce them you must connect the app as a **non-superuser role**.
But with strict RLS, **any DB connection that hasn't run `SET app.tenant_id`
sees/writes nothing.** The app does NOT yet set that per request — doing so needs
a request-scoped DB connection (AsyncLocalStorage + `SET app.tenant_id` on
checkout) wrapping every route, plus a bypass for the **login** path (it looks up
users by email before a tenant is known). That app-side work is **not done yet**.

**So: do NOT switch the Railway role until the app-side `SET app.tenant_id`
mechanism + login bypass ship.** Until then, the app-layer `WHERE tenant_id = $n`
filtering (live + tested) is the isolation. This runbook is the procedure for when
that work lands.

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
