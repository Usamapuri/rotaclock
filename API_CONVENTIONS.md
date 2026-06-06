# API Conventions & Consolidation Map (Phase 5)

How API routes should be written, and the plan for collapsing today's duplicate
endpoint families. The mass migration is **deferred to pair with Phase 6**
(frontend), because changing response shapes / deleting endpoints requires
updating callers in lockstep — see the note at the bottom.

## Conventions for new / migrated routes

1. **Response envelope** — return `{ success, data?, error? }` via `lib/api-response.ts`:
   ```ts
   import { ok, created, fail, unauthorized, notFound } from '@/lib/api-response'
   return ok(rows)            // 200 { success:true, data: rows }
   return created(row)        // 201
   return fail('Bad input')   // 400 { success:false, error }
   ```
2. **Validation** — validate every body/query with zod via `lib/validate.ts`:
   ```ts
   const parsed = await parseBody(request, MySchema)
   if (!parsed.success) return parsed.response
   const data = parsed.data
   ```
   Whitelist updatable columns in any dynamic `SET`-clause builder (never spread
   arbitrary body keys into SQL).
3. **Auth + tenant** — `createApiAuthMiddleware()` (or `withAuth`/`withTenant`)
   on every route; scope every query by `tenant_id` (Phases 2–3).
4. **One resource, role-scoped actions** — don't create per-role endpoint copies.

## Duplicate endpoint families → canonical target

### Shift swaps  → canonical: `/api/shifts/swap-requests` (+ `/[id]`)
| Endpoint | Status | Callers |
|---|---|---|
| `shifts/swap-requests` (GET/POST, `[id]`) | **keep (canonical)** — tenant-scoped | `app/admin/dashboard`, `lib/api-service.ts` |
| `shifts/swap-request` (POST date-based, `[id]`) | keep (employee create flow); fold into canonical later | `app/employee/scheduling` |
| `shifts/swaps` (+route) | ✅ DELETED | was a cross-tenant leak (GET dropped tenant filter) + demo-broken POST (requester = first active employee); only caller was a dead component |
| `manager/approvals/shift-swap/[id]` | keep (approval action) | `app/manager/approvals` |
Done: deleted the leaky/broken `shifts/swaps`; hardened `getShiftSwaps` to require tenant_id. Remaining: fold the employee date-based `swap-request` create into `swap-requests`.

### Leave requests  → canonical: `/api/leave-requests` (+ `/[id]`, role-scoped)
| Endpoint | Status | Callers |
|---|---|---|
| `leave-requests` (GET/POST) | **keep (canonical)** | admin, employee dashboards, `components/ui/*` |
| `admin/leave-requests/[id]` | fold into `leave-requests/[id]` PATCH | `app/admin/leave` |
| `manager/approvals/leave-request/[id]` | fold (role-scoped) | `app/manager/approvals` |
| `employees/leave-requests` (+`[id]`) | ✅ DELETED | was a tenant leak (GET dropped tenant filter); employee create migrated to canonical |
| `onboarding/leave-requests/[id]` | n/a (never existed) | was only called by a now-deleted dead component |
Done: canonical POST now accepts `leave_type` alias + auto-derives days_requested; employee/scheduling migrated to it; `employees/leave-requests` deleted; `getLeaveRequests` hardened to require tenant_id. Remaining: fold the admin + manager approve/reject `[id]` endpoints into a role-scoped `PATCH /api/leave-requests/[id]` (left intact for now — they carry role-specific approval logic).

### Assignments  → write via `/api/scheduling/assign`; read via scheduling
| Endpoint | Status | Callers |
|---|---|---|
| `scheduling/assign` (POST/PUT/DELETE) | **keep (canonical writer)** | scheduling components |
| `shifts/assignments` (GET read, POST dup) | move GET to scheduling; delete dup POST | `app/admin/dashboard` (GET) |
Note: the `shifts` vs `rotas` vs `scheduling` route groups are reconciled more fully in Phase 7 (scheduling is the domain core).

## Dead frontend components
`components/ui/{swap-requests,leave-requests,employee-requests}.tsx` — ✅ DELETED (not imported anywhere; called stale/nonexistent endpoints).

## Why the migration is deferred
Switching routes to the envelope and deleting endpoint families changes
contracts the frontend depends on. The codebase has ~41 pages hand-rolling
`fetch` with assorted response-shape assumptions. Doing this safely means
migrating routes and their callers together — which is Phase 6's job. Phase 5
lands the **standards** (`api-response`, `validate`) and this map; Phases 5+6
then execute against it in lockstep.
