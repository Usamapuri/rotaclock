/**
 * Pure calendar helpers for YYYY-MM-DD (roster / PostgreSQL DATE).
 * Never use `new Date('YYYY-MM-DD')` — it is UTC midnight and shifts weekday in most local timezones.
 */

export function mondayOfWeekContaining(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) throw new Error(`Invalid YMD: ${ymd}`)
  const t = Date.UTC(y, m - 1, d)
  const dow = new Date(t).getUTCDay()
  const daysToMonday = dow === 0 ? 6 : dow - 1
  return new Date(t - daysToMonday * 86400000).toISOString().slice(0, 10)
}

export function sundayOfWeekContaining(ymd: string): string {
  const mon = mondayOfWeekContaining(ymd)
  const [y, m, d] = mon.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10)
}

export function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10)
}

/** Mon..Sun inclusive */
export function weekDayListMonSun(mondayYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(mondayYmd, i))
}

/** Local calendar today (browser) — highlights, “jump to today” */
export function localTodayYmd(): string {
  const n = new Date()
  const y = n.getFullYear()
  const mo = String(n.getMonth() + 1).padStart(2, '0')
  const da = String(n.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export function formatYmdDisplay(ymd: string, opts?: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, opts ?? { weekday: 'short', month: 'short', day: 'numeric' })
}
