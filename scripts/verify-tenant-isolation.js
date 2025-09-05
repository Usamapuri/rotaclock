const { Pool } = require('pg')

async function run() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2]
  if (!dbUrl) {
    console.error('Usage: node scripts/verify-tenant-isolation.js [DATABASE_URL]')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    const results = {
      createdRole: false,
      t1Insert: false,
      t2Insert: false,
      t2SeesT2: false,
      t2SeesT1: false,
      cleanup: false,
    }

    // Ensure verifier role
    await client.query(`DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotaclock_verifier') THEN
        CREATE ROLE rotaclock_verifier LOGIN PASSWORD 'verify_pass' NOSUPERUSER NOCREATEDB NOCREATEROLE;
      END IF;
    END $$;`)

    await client.query(`GRANT USAGE ON SCHEMA public TO rotaclock_verifier;`)
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rotaclock_verifier;`)
    results.createdRole = true

    // Insert tenant_t1 data
    await client.query(`SELECT set_config('app.tenant_id', 'tenant_t1', false);`)
    await client.query(`INSERT INTO organizations (tenant_id, name, slug, email, is_active, is_verified)
      VALUES('tenant_t1','Tenant T1','tenant-t1','t1@example.com', true, true)
      ON CONFLICT (tenant_id) DO NOTHING;`)
    await client.query(`INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
      VALUES('tenant_t1','T1EMP','T1','User','t1user@example.com','admin', true)
      ON CONFLICT (tenant_id, email) DO NOTHING;`)
    results.t1Insert = true

    // Insert tenant_t2 data
    await client.query(`SELECT set_config('app.tenant_id', 'tenant_t2', false);`)
    await client.query(`INSERT INTO organizations (tenant_id, name, slug, email, is_active, is_verified)
      VALUES('tenant_t2','Tenant T2','tenant-t2','t2@example.com', true, true)
      ON CONFLICT (tenant_id) DO NOTHING;`)
    await client.query(`INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
      VALUES('tenant_t2','T2EMP','T2','User','t2user@example.com','admin', true)
      ON CONFLICT (tenant_id, email) DO NOTHING;`)
    results.t2Insert = true

    // Validate visibility as tenant_t2
    await client.query(`SET ROLE rotaclock_verifier;`)
    await client.query(`SELECT set_config('app.tenant_id', 'tenant_t2', false);`)
    const t2Count = await client.query(`SELECT COUNT(*)::int AS cnt FROM employees`) // RLS filters to t2
    const t1VisibleCount = await client.query(`SELECT COUNT(*)::int AS cnt FROM employees WHERE tenant_id = 'tenant_t1'`)
    results.t2SeesT2 = t2Count.rows[0].cnt >= 1
    results.t2SeesT1 = t1VisibleCount.rows[0].cnt > 0

    // Cleanup t2 rows then t1 rows
    await client.query(`RESET ROLE;`)
    await client.query(`DELETE FROM employees WHERE tenant_id = 'tenant_t2';`)
    await client.query(`DELETE FROM organizations WHERE tenant_id = 'tenant_t2';`)
    await client.query(`DELETE FROM employees WHERE tenant_id = 'tenant_t1';`)
    await client.query(`DELETE FROM organizations WHERE tenant_id = 'tenant_t1';`)
    results.cleanup = true

    // Print summary
    const passed = results.createdRole && results.t1Insert && results.t2Insert && results.t2SeesT2 && !results.t2SeesT1 && results.cleanup
    console.log('Tenant Isolation Verification Results:')
    console.log(`- createdRole: ${results.createdRole ? 'pass' : 'fail'}`)
    console.log(`- t1Insert: ${results.t1Insert ? 'pass' : 'fail'}`)
    console.log(`- t2Insert: ${results.t2Insert ? 'pass' : 'fail'}`)
    console.log(`- t2SeesOwn (t2SeesT2): ${results.t2SeesT2 ? 'pass' : 'fail'}`)
    console.log(`- noLeakToT2 (t2SeesT1 == false): ${!results.t2SeesT1 ? 'pass' : 'fail'}`)
    console.log(`- cleanup: ${results.cleanup ? 'pass' : 'fail'}`)
    console.log(`Overall: ${passed ? 'PASS' : 'FAIL'}`)

    process.exit(passed ? 0 : 2)
  } catch (err) {
    console.error('Verification error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()


