const { Pool } = require('pg')

async function run() {
  const dbUrl = process.env.DATABASE_URL || process.argv[2]
  if (!dbUrl) {
    console.error('Usage: node scripts/seed-tenants.js [DATABASE_URL]')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  const client = await pool.connect()
  try {
    // Seed demo tenant: rotaclock (org may already exist)
    await client.query(`SELECT set_config('app.tenant_id', 'rotaclock', true);`)
    await client.query(`INSERT INTO organizations (tenant_id, name, slug, email, subscription_status, subscription_plan, is_verified, is_active)
      VALUES ('rotaclock','RotaClock Organization','rotaclock-organization','admin@rotaclock.com','trial','basic', true, true)
      ON CONFLICT (tenant_id) DO NOTHING;`)
    await client.query(`INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
      VALUES ('rotaclock', 'RCADMIN', 'Rota', 'Admin', 'admin@rotaclock.com', 'admin', true)
      ON CONFLICT (tenant_id, email) DO NOTHING;`)

    // Seed LogiCode tenant: organization + single admin
    await client.query(`SELECT set_config('app.tenant_id', 'logicode', true);`)
    await client.query(`INSERT INTO organizations (tenant_id, name, slug, email, subscription_status, subscription_plan, is_verified, is_active)
      VALUES ('logicode','LogiCode Services','logicode-services','admin@logicode.com','trial','basic', true, true)
      ON CONFLICT (tenant_id) DO NOTHING;`)
    await client.query(`INSERT INTO employees (tenant_id, employee_code, first_name, last_name, email, role, is_active)
      VALUES ('logicode', 'LGADMIN', 'Logi', 'Admin', 'admin@logicode.com', 'admin', true)
      ON CONFLICT (tenant_id, email) DO NOTHING;`)

    console.log('Seed completed: rotaclock org/admin, logicode org/admin')
  } catch (err) {
    console.error('Seed error:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()


