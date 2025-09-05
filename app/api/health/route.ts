export async function GET() {
  const body = JSON.stringify({ ok: true, service: 'health', timestamp: new Date().toISOString() })
  return new Response(body, { headers: { 'content-type': 'application/json' } })
}
