/**
 * Standard API response envelope: { success, data?, error? }.
 *
 * Use these helpers in new and migrated routes so every endpoint returns a
 * predictable shape. (Phase 5 — API consolidation. Existing routes are migrated
 * in lockstep with their frontend callers; see CONTRIBUTING.md.)
 */
import { NextResponse } from 'next/server'

export type ApiOk<T> = { success: true; data: T }
export type ApiErr = { success: false; error: string; details?: unknown }

/** 200 with a data payload. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ success: true, data }, init)
}

/** 201 Created with a data payload. */
export function created<T>(data: T): NextResponse {
  return NextResponse.json({ success: true, data }, { status: 201 })
}

/** Error response with a message and status (default 400). */
export function fail(error: string, status = 400, details?: unknown): NextResponse {
  const body: ApiErr = { success: false, error }
  if (details !== undefined) body.details = details
  return NextResponse.json(body, { status })
}

export const unauthorized = (msg = 'Unauthorized') => fail(msg, 401)
export const forbidden = (msg = 'Forbidden') => fail(msg, 403)
export const notFound = (msg = 'Not found') => fail(msg, 404)
export const serverError = (msg = 'Internal server error') => fail(msg, 500)
