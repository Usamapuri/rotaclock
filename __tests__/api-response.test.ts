import { ok, created, fail, unauthorized, forbidden, notFound } from '@/lib/api-response'

describe('lib/api-response envelope', () => {
  it('ok() -> 200 { success:true, data }', async () => {
    const res = ok({ x: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { x: 1 } })
  })

  it('created() -> 201', async () => {
    const res = created({ id: 'a' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ success: true, data: { id: 'a' } })
  })

  it('fail() -> { success:false, error } with status + details', async () => {
    const res = fail('bad', 400, { field: 'name' })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ success: false, error: 'bad', details: { field: 'name' } })
  })

  it('shorthands map to the right status codes', async () => {
    expect(unauthorized().status).toBe(401)
    expect(forbidden().status).toBe(403)
    expect(notFound().status).toBe(404)
  })
})
