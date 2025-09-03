export const query = jest.fn(async (text?: any, params?: any[]) => {
  const sql = String(text || '')
  if (/FROM\s+employees\s+WHERE\s+(id|employee_code)\s*=\s*\$1/i.test(sql)) {
    const idOrCode = params?.[0]
    if (idOrCode) {
      return { rows: [{ id: idOrCode, employee_code: 'EMP_TL', email: 'tl@example.com', role: 'team_lead' }], rowCount: 1 }
    }
  }
  return { rows: [], rowCount: 0 }
})
export const optimizedQuery = jest.fn(async () => ({ rows: [], rowCount: 0 }))
export const transaction = jest.fn(async (cb: any) => cb({
  query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
  release: jest.fn(),
}))

export const getTeamByLead = jest.fn(async (leadId: string) => ({ id: 'team-123', team_lead_id: leadId }))
export const addEmployeeToTeam = jest.fn(async () => true)
export const removeEmployeeFromTeam = jest.fn(async () => true)
export const isEmployeeInTeamLeadTeam = jest.fn(async () => true)


