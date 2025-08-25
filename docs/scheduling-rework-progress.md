# Scheduling Rework Progress

This document tracks incremental changes to the scheduling workflow.

## 1. Database
- Added per-assignment overrides to `shift_assignments_new`:
  - `override_name TEXT`
  - `override_start_time TIME`
  - `override_end_time TIME`
  - `override_color TEXT`
- Made `template_id` nullable to allow override-only assignments.

Files:
- `scripts/cleanup_db.sql`

## 2. API
- Updated `POST /api/scheduling/assign`:
  - Accepts either `template_id` or override fields.
  - Persists overrides and returns them in the payload.
- Updated `PUT /api/scheduling/assign`:
  - Allows updating template and/or overrides for an assignment.
- Updated `GET /api/scheduling/week/[date]`:
  - Returns effective `template_name`, `start_time`, `end_time`, `color` with `COALESCE` to overrides.

Files:
- `app/api/scheduling/assign/route.ts`
- `app/api/scheduling/week/[date]/route.ts`

## 3. UI
- `ShiftAssignmentModal` no longer creates ad-hoc templates; it can send overrides directly.
- Added search input to week schedule to filter employees client-side.
- Added `ShiftEditModal` to edit a single-day assignment (template swap or custom overrides). Opened by clicking an assignment.

Files:
- `components/scheduling/ShiftAssignmentModal.tsx`
- `components/scheduling/WeekGrid.tsx`
- `components/scheduling/ShiftEditModal.tsx`
- `components/scheduling/ShiftCell.tsx`

## Next considerations
- Server-side validation for time formats on overrides.
- Optional color picker in edit modal.
- Bulk edit for a range of days.


