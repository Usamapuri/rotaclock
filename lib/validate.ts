/**
 * Request validation helpers built on zod. They return a discriminated result
 * so routes can fail fast with a consistent 400 envelope:
 *
 *   const parsed = await parseBody(request, MySchema)
 *   if (!parsed.success) return parsed.response
 *   const { name } = parsed.data
 *
 * (Phase 5 — every request body/query should be validated.)
 */
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { fail } from './api-response'

type ParseResult<T> = { success: true; data: T } | { success: false; response: ReturnType<typeof fail> }

function formatError(error: z.ZodError): { message: string; details: unknown } {
  return { message: 'Validation failed', details: error.flatten() }
}

/** Parse + validate a JSON request body. */
export async function parseBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { success: false, response: fail('Invalid JSON body', 400) }
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const { message, details } = formatError(result.error)
    return { success: false, response: fail(message, 400, details) }
  }
  return { success: true, data: result.data }
}

/** Parse + validate URL search params (coerce as needed in the schema). */
export function parseQuery<T>(searchParams: URLSearchParams, schema: z.ZodType<T>): ParseResult<T> {
  const obj = Object.fromEntries(searchParams.entries())
  const result = schema.safeParse(obj)
  if (!result.success) {
    const { message, details } = formatError(result.error)
    return { success: false, response: fail(message, 400, details) }
  }
  return { success: true, data: result.data }
}
