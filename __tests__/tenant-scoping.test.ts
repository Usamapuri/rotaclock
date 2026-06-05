import {
  getShifts,
  getShift,
  getEmployees,
  getEmployee,
  getShiftAssignments,
  getTimeEntries,
  getAttendanceSummary,
  getBreakLogs,
} from '@/lib/database'

/**
 * Phase 3 invariant: tenant-scoped data-access helpers fail closed when no
 * tenant_id is supplied, rather than silently querying across all tenants.
 * assertTenant throws before any DB query runs, so these need no database.
 */
describe('data-layer tenant scoping (fails closed without tenant_id)', () => {
  const dates = { start_date: '2024-01-01', end_date: '2024-01-31' }

  it('getShifts requires tenant_id', async () => {
    await expect(getShifts({} as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getShift requires tenant_id', async () => {
    await expect(getShift('some-id', undefined as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getEmployees requires tenant_id', async () => {
    await expect(getEmployees({} as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getEmployee requires tenant_id', async () => {
    await expect(getEmployee('some-id', undefined as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getShiftAssignments requires tenant_id', async () => {
    await expect(getShiftAssignments({ ...dates } as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getTimeEntries requires tenant_id', async () => {
    await expect(getTimeEntries({} as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getAttendanceSummary requires tenant_id', async () => {
    await expect(getAttendanceSummary({ ...dates } as any)).rejects.toThrow(/tenant_id is required/)
  })
  it('getBreakLogs requires tenant_id', async () => {
    await expect(getBreakLogs({} as any)).rejects.toThrow(/tenant_id is required/)
  })
})
