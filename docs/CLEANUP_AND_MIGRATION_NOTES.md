## Codebase cleanup and EMP code migration

### Removed pages and routes

Removed duplicate and test-only endpoints/pages to reduce page count and avoid confusion:

- Duplicate shift template APIs (UI uses `app/api/scheduling/templates`):
  - Deleted `app/api/shift-templates/route.ts`
  - Deleted `app/api/shifts/templates/route.ts`
- Legacy shift assignments (UI uses `app/api/scheduling/*`):
  - Deleted `app/api/shift-assignments/route.ts`
  - Deleted `app/api/shift-assignments/week/[date]/route.ts`
- Test/demo pages:
  - Deleted `app/test-team-lead/page.tsx`
  - Deleted `app/test-auth/page.tsx`

These removals are safe based on fetch usage audit across `app/`.

### Scheduling assign API adjustments

- Updated `app/api/scheduling/assign/route.ts` to accept `template_id` (continues to accept legacy `shift_id`).
- DELETE now targets `shift_assignments_new` for consistency with the optimized schema.

### Employee EMP code standard

- Standard business identifier is `employee_code` with `EMP` prefix, e.g., `EMP001`.
- Migration script added: `scripts/migrate-employee-codes.sql`
  - Backfills missing/non-EMP codes with sequential `EMP###` values.
  - Enforces uniqueness.

### How to run

1) Ensure DATABASE_URL points to your Railway PostgreSQL.
2) Apply migration:
   - psql: `psql "$DATABASE_URL" -f scripts/migrate-employee-codes.sql`
3) Build and tests:
   - `npm run build`
   - `npm test`

### Local testing

- Dev server: `npm run dev:regular` → `http://localhost:3000`
- Production server: `PORT=3001 npm run start` → `http://localhost:3001`
- New scheduling UI: `http://localhost:3000/admin/scheduling`
- Smoke tests (requires server running on 3000):
  - `node scripts/smoke-scheduling.mjs`
- Database cleanup (destroys legacy demo data):
  - `psql "$DATABASE_URL" -f scripts/cleanup_db.sql`

Post-cleanup:
- Re-run `scripts/migrate-employee-codes.sql` to normalize codes
- Log in with any demo email using `password123`
- Create shift templates and assign shifts on `/admin/scheduling`

What the smoke test covers:
- GET `/api/scheduling/employees` and `/api/scheduling/templates`
- GET `/api/scheduling/week/:date`
- POST `/api/scheduling/templates` to create a template
- POST `/api/scheduling/assign` to assign a shift
- PUT `/api/scheduling/assign` to edit the assignment
- DELETE `/api/scheduling/assign?id=...` to remove the assignment

### Notes and follow-ups

- UI components already use `employee_code` in scheduling. Admin dashboard and older areas still declare `employee_id` in local types; these are independent of DB and can be refactored later to display `employee_code` label.
- If you used the legacy tables (`employees`, `shift_assignments`), prefer the optimized ones (`employees_new`, `shift_assignments_new`).


