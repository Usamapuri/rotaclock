// Minimal copy script from DEV to NEW (Railway)
// Uses the same approach as simple-copy.js but with new destination

const { Pool } = require('pg');

const DEV_DB = process.env.DEV_DATABASE_URL
const NEW_DB = process.env.DATABASE_URL

async function run() {
  if (!DEV_DB || !NEW_DB) {
    console.error('Set DEV_DATABASE_URL (source) and DATABASE_URL (target).')
    process.exit(1)
  }
  const sourcePool = new Pool({ connectionString: DEV_DB, ssl: { rejectUnauthorized: false } })
  const targetPool = new Pool({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } })

  const src = await sourcePool.connect()
  const dst = await targetPool.connect()

  try {
    console.log('🔄 Copying DEV -> NEW (Railway) ...')

    // list tables
    const tablesRes = await src.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
    )
    const tables = tablesRes.rows.map(r => r.table_name)
    console.log(`📋 Found ${tables.length} tables`)

    // drop existing on target (reverse order)
    for (const t of [...tables].reverse()) {
      await dst.query(`DROP TABLE IF EXISTS "${t}" CASCADE`)
    }

    // create and copy
    for (const t of tables) {
      // columns
      const cols = (await src.query(
        "SELECT column_name, data_type, is_nullable, character_maximum_length, numeric_precision, numeric_scale, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
        [t]
      )).rows

      // build create
      const def = cols.map(c => {
        let dt = c.data_type
        if (dt === 'character varying') dt = 'VARCHAR' + (c.character_maximum_length ? `(${c.character_maximum_length})` : '')
        else if (dt === 'numeric') dt = 'DECIMAL' + (c.numeric_precision ? `(${c.numeric_precision}${c.numeric_scale != null ? ',' + c.numeric_scale : ''})` : '')
        else if (dt === 'timestamp with time zone') dt = 'TIMESTAMP WITH TIME ZONE'
        else if (dt === 'timestamp without time zone') dt = 'TIMESTAMP'
        else if (dt === 'time without time zone') dt = 'TIME'
        else if (dt === 'boolean') dt = 'BOOLEAN'
        else if (dt === 'integer') dt = 'INTEGER'
        else if (dt === 'bigint') dt = 'BIGINT'
        else if (dt === 'uuid') dt = 'UUID'
        else if (dt === 'text') dt = 'TEXT'
        return `  "${c.column_name}" ${dt}` + (c.is_nullable === 'NO' ? ' NOT NULL' : '') + (c.column_default ? ` DEFAULT ${c.column_default}` : '')
      }).join(',\n')

      const createSQL = `CREATE TABLE "${t}" (\n${def}\n)`
      await dst.query(createSQL)

      // data copy
      const data = (await src.query(`SELECT * FROM "${t}"`)).rows
      if (data.length) {
        const columns = Object.keys(data[0])
        const names = columns.map(c => `"${c}"`).join(', ')
        const ph = columns.map((_, i) => `$${i + 1}`).join(', ')
        for (const row of data) {
          await dst.query(`INSERT INTO "${t}" (${names}) VALUES (${ph})`, columns.map(c => row[c]))
        }
      }
      console.log(`✅ Copied ${t} (${data.length} rows)`)    
    }

    console.log('🎉 Copy complete')
  } catch (e) {
    console.error('❌ Copy failed:', e)
    process.exit(1)
  } finally {
    src.release()
    dst.release()
    await sourcePool.end()
    await targetPool.end()
  }
}

run()
