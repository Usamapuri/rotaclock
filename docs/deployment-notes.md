# Deployment & Rollback Notes

## Prerequisites
- DATABASE_URL set to Railway PostgreSQL
- Node 20+, npm/pnpm installed

## One-time Migrations
- Run: `npm run db:migrate:teamlead`
- Creates: `teams`, `team_assignments`, adds `employees.role` & `employees.team_id`, creates `performance_metrics`

## Seeding (Optional for Demo)
- Seed teams/leads/members: `node scripts/seed-teams-demo.js`
- Seed today metrics for team: `node scripts/seed-today-metrics.js <teamId>`

## Build & Start
- Clean build:
  - Stop dev, delete `.next`, run `npm run build`
- Start: `npm start`

## Environment
- `.env.local` must include `DATABASE_URL` (and any feature flags)
- In production, use platform secrets instead of .env files

## Rollback
- If migrations need rollback:
  - Drop `team_assignments`, `teams` if needed
  - Remove FK `fk_employees_team_id`
  - Optionally drop columns `employees.role`, `employees.team_id`
- Restore DB from snapshot if available

## Monitoring
- Watch API logs for:
  - Role-based access errors
  - Slow queries on teams and metrics endpoints
- Add indexes if teams grow large (department, team_lead_id combinations)
