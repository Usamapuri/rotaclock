import { NextRequest } from 'next/server'
import { z } from 'zod'
import { parseBody, parseQuery } from '@/lib/validate'

const schema = z.object({ name: z.string().min(1), age: z.coerce.number().optional() })

function jsonReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('lib/validate', () => {
  it('parseBody returns data on valid input', async () => {
    const r = await parseBody(jsonReq({ name: 'Ada' }), schema)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Ada')
  })

  it('parseBody returns a 400 response on invalid input', async () => {
    const r = await parseBody(jsonReq({ name: '' }), schema)
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.response.status).toBe(400)
      expect((await r.response.json()).success).toBe(false)
    }
  })

  it('parseBody returns a 400 response on non-JSON body', async () => {
    const req = new NextRequest('http://localhost/api/x', { method: 'POST', body: 'not json' })
    const r = await parseBody(req, schema)
    expect(r.success).toBe(false)
  })

  it('parseQuery validates + coerces search params', () => {
    const r = parseQuery(new URLSearchParams('name=Ada&age=42'), schema)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.age).toBe(42)
  })
})
