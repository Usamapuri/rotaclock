const fetch = require('node-fetch')

async function testByLead(leadId) {
  const res = await fetch(`http://localhost:3000/api/teams/by-lead?leadId=${leadId}`)
  const body = await res.json()
  console.log('\n[by-lead]', res.status, Array.isArray(body.data) ? `teams=${body.data.length}` : body.error)
  return body.data?.[0]?.id
}

async function testMembers(teamId) {
  const res = await fetch(`http://localhost:3000/api/teams/${teamId}/members`)
  const body = await res.json()
  console.log('[members]', res.status, Array.isArray(body.data) ? `members=${body.data.length}` : body.error)
}

async function testLive(teamId) {
  const res = await fetch(`http://localhost:3000/api/teams/${teamId}/live-status`)
  const body = await res.json()
  console.log('[live-status]', res.status, body.data ? body.data.stats : body.error)
}

async function testQueue(teamId) {
  const res = await fetch(`http://localhost:3000/api/teams/${teamId}/queue-status`)
  const body = await res.json()
  console.log('[queue-status]', res.status, body.data ? body.data.queue_stats : body.error)
}

async function main() {
  // Using demo admin id as team lead for now; adjust to a real lead UUID in DB if needed
  const leadId = '3cae45f4-f119-41d2-b24f-66a7249cf974'
  const teamId = await testByLead(leadId)
  if (!teamId) {
    console.log('No team found for lead; create a team in /admin/teams and re-run.')
    return
  }
  await testMembers(teamId)
  await testLive(teamId)
  await testQueue(teamId)
}

main().catch(err => { console.error(err); process.exit(1) })


