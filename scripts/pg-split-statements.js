/**
 * Split a PostgreSQL script on ';' boundaries outside of quotes and dollar-quotes.
 * Good enough for database-schema.sql (no nested $ delimiters beyond standard $$...$$).
 */
function splitPgStatements(sql) {
  const statements = []
  let buf = ''
  let i = 0
  let inSingle = false
  let inDouble = false
  let dollarTag = null /** @type {string|null} full opener e.g. $$ or $tag$ */

  const startsDollarQuote = (s, pos) => {
    if (s[pos] !== '$') return null
    const rest = s.slice(pos + 1)
    const m = rest.match(/^([a-zA-Z_]*)\$/)
    if (!m) return null
    const tag = m[1] || ''
    return '$' + tag + '$'
  }

  while (i < sql.length) {
    const ch = sql[i]

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag
        i += dollarTag.length
        dollarTag = null
        continue
      }
      buf += ch
      i++
      continue
    }

    if (!inSingle && !inDouble) {
      // Line comment: consume to end of line so a ';' inside it isn't treated
      // as a statement boundary (e.g. "-- ...target; display_name for UI").
      if (ch === '-' && sql[i + 1] === '-') {
        const nl = sql.indexOf('\n', i)
        const end = nl === -1 ? sql.length : nl
        buf += sql.slice(i, end)
        i = end
        continue
      }
      // Block comment: consume to the closing */.
      if (ch === '/' && sql[i + 1] === '*') {
        const close = sql.indexOf('*/', i + 2)
        const end = close === -1 ? sql.length : close + 2
        buf += sql.slice(i, end)
        i = end
        continue
      }
      const dq = startsDollarQuote(sql, i)
      if (dq) {
        dollarTag = dq
        buf += dq
        i += dq.length
        continue
      }
    }

    if (ch === "'" && !inDouble) {
      buf += ch
      i++
      if (inSingle && sql[i] === "'") {
        buf += "'"
        i++
        continue
      }
      inSingle = !inSingle
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      buf += ch
      i++
      continue
    }

    if (!inSingle && !inDouble && ch === ';') {
      const t = buf.trim()
      if (t.length > 0) statements.push(t)
      buf = ''
      i++
      continue
    }

    buf += ch
    i++
  }

  const tail = buf.trim()
  if (tail.length > 0) statements.push(tail)
  return statements
}

module.exports = { splitPgStatements }
