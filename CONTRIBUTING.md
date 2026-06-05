# Contributing — RotaClock

Working notes for the in-progress refactor. See `REFACTOR_PLAN.md` for the full
phased plan and `CLAUDE.md` for audit findings and conventions.

## Branch workflow

- **Branch-per-phase.** Each refactor phase gets its own branch off `main`
  (e.g. `phase-0-stabilize`, `phase-2-auth`). Keep PRs small and each phase
  independently shippable.
- Don't reorder feature work ahead of the security phases (2–3). This is a
  locked decision — a multi-tenant SaaS cannot ship on the current auth model.

## Code conventions

- All DB access goes through `lib/database.ts` `query()` with `$n` params.
  Never build SQL by string concatenation; never `new Pool` in routes.
- New routes MUST authenticate (`lib/api-auth.ts`) and scope every query by
  `tenant_id`. Prefer a shared `withAuth`/`withTenant` wrapper over copy-paste.
- Frontend chrome (header / sidebar / logout) lives only in
  `components/layouts/DashboardShell.tsx`.
- Never commit secrets or connection strings. Read `DATABASE_URL` from the
  environment.

## Environment

- `DATABASE_URL` — Postgres connection string (required).
- `JWT_SECRET` — secret used to sign session tokens. **Required in production**
  (must be >= 16 chars). In development the app falls back to a fixed, insecure
  dev secret with no config needed; never rely on that fallback in production.

## Database

- `npm run db:railway-reset` drops `public`, applies `database-schema.sql`, and
  seeds. The DB in this repo's environment holds no production data and may be
  freely reset.
