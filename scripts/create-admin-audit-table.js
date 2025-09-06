const { Pool } = require('pg')

// Use DATABASE_URL if provided; otherwise fall back to the same default used by the app pool
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:QlUXSBsWFuwjhodaivUXTUXDuQhWigHL@metro.proxy.rlwy.net:36516/railway'

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_audit_logs'
  ) THEN
    CREATE TABLE admin_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      target_user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
      details JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);
  END IF;
END$$;
`;

async function main() {
  try {
    console.log('Connecting to database...')
    await pool.query('SELECT 1')
    console.log('Creating admin_audit_logs if missing...')
    await pool.query(SQL)
    console.log('admin_audit_logs ensured ✅')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main()
}

module.exports = { main }



