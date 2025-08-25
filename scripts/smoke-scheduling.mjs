import http from 'node:http'

const base = process.env.BASE_URL || 'http://localhost:3000'

async function getJson(path) {
  const res = await fetch(`${base}${path}`)
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function postJson(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function putJson(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function del(path) {
  const res = await fetch(`${base}${path}`, { method: 'DELETE' })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

async function run() {
  console.log('🔎 Smoke test: employees list...')
  const emp = await getJson('/api/scheduling/employees')
  if (!emp.ok) throw new Error(`employees failed: ${emp.status}`)
  const employee = emp.json.data?.[0]

  console.log('🔎 Smoke test: templates list...')
  const tmpl = await getJson('/api/scheduling/templates')
  if (!tmpl.ok) throw new Error(`templates failed: ${tmpl.status}`)

  console.log('🔎 Smoke test: week data...')
  const today = new Date().toISOString().split('T')[0]
  const wk = await getJson(`/api/scheduling/week/${today}`)
  if (!wk.ok) throw new Error(`week failed: ${wk.status}`)

  console.log('🔎 Smoke test: create template...')
  const newTemplateName = `Auto Test ${Date.now()}`
  const tCreate = await postJson('/api/scheduling/templates', {
    name: newTemplateName,
    start_time: '09:00',
    end_time: '17:00',
    department: 'General',
    required_staff: 1,
    color: '#3B82F6',
  })
  if (!tCreate.ok) throw new Error(`create template failed: ${tCreate.status} ${JSON.stringify(tCreate.json)}`)
  const templateId = tCreate.json.data?.id

  if (employee && templateId) {
    console.log('🔎 Smoke test: assign shift...')
    const assign = await postJson('/api/scheduling/assign', {
      employee_id: employee.id,
      template_id: templateId,
      date: today,
      notes: 'smoke test',
    })
    if (!assign.ok) throw new Error(`assign failed: ${assign.status} ${JSON.stringify(assign.json)}`)

    console.log('🔎 Smoke test: edit assignment via PUT...')
    const assignmentId = assign.json.data?.id
    const edit = await putJson('/api/scheduling/assign', { id: assignmentId, notes: 'edited' })
    if (!edit.ok) throw new Error(`edit assign failed: ${edit.status} ${JSON.stringify(edit.json)}`)

    console.log('🔎 Smoke test: delete assignment...')
    const delRes = await del(`/api/scheduling/assign?id=${assignmentId}`)
    if (!delRes.ok) throw new Error(`delete assign failed: ${delRes.status} ${JSON.stringify(delRes.json)}`)
  } else {
    console.log('ℹ️ Skipping assignment tests, missing employee or template.')
  }

  console.log('✅ Scheduling smoke tests passed')
}

run().catch((e) => {
  console.error('❌ Smoke test failed:', e.message)
  process.exit(1)
})


