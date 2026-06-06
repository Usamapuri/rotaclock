import { AsyncLocalStorage } from 'node:async_hooks'
import type { PoolClient } from 'pg'

/**
 * Per-request database context. When a request establishes a tenant-scoped
 * connection (see runWithTenantConnection in lib/database.ts), the checked-out
 * client is stored here so that every `query()` during that request runs on the
 * SAME connection — the one that has `SET app.tenant_id` applied.
 *
 * This is what makes DB-enforced RLS possible (each request's queries carry the
 * tenant GUC), and it also gives those requests real transaction support
 * (BEGIN/COMMIT via query() stay on one connection instead of bouncing across
 * the pool).
 */
export const dbContext = new AsyncLocalStorage<{ client: PoolClient }>()
