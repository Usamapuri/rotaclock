const { Pool } = require('pg')

// Railway database configuration using public URL
const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function runPayrollMigration() {
  try {
    console.log('🔄 Running payroll system migration...')

    // Create tables one by one
    console.log('📝 Creating employee_salaries table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_salaries (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL UNIQUE,
        base_salary DECIMAL(10,2) NOT NULL DEFAULT 20000.00,
        hourly_rate DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(3) DEFAULT 'PKR',
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log('📝 Creating payroll_periods table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_periods (
        id SERIAL PRIMARY KEY,
        period_name VARCHAR(100) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        total_employees INTEGER DEFAULT 0,
        total_payroll_amount DECIMAL(12,2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log('📝 Creating payroll_records table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_records (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        payroll_period_id INTEGER,
        base_salary DECIMAL(10,2) NOT NULL,
        hours_worked DECIMAL(8,2) DEFAULT 0.00,
        hourly_pay DECIMAL(10,2) DEFAULT 0.00,
        overtime_hours DECIMAL(8,2) DEFAULT 0.00,
        overtime_pay DECIMAL(10,2) DEFAULT 0.00,
        bonus_amount DECIMAL(10,2) DEFAULT 0.00,
        deductions_amount DECIMAL(10,2) DEFAULT 0.00,
        gross_pay DECIMAL(10,2) DEFAULT 0.00,
        net_pay DECIMAL(10,2) DEFAULT 0.00,
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_date DATE,
        payment_method VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log('📝 Creating payroll_deductions table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_deductions (
        id SERIAL PRIMARY KEY,
        payroll_record_id INTEGER,
        employee_id VARCHAR(50) NOT NULL,
        deduction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        applied_by VARCHAR(50),
        applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log('📝 Creating payroll_bonuses table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_bonuses (
        id SERIAL PRIMARY KEY,
        payroll_record_id INTEGER,
        employee_id VARCHAR(50) NOT NULL,
        bonus_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        applied_by VARCHAR(50),
        applied_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_approved BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    console.log('📝 Creating payroll_settings table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)

    // Create indexes
    console.log('📝 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_employee_salaries_employee_id ON employee_salaries(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON payroll_records(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_records_period_id ON payroll_records(payroll_period_id)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_records_payment_status ON payroll_records(payment_status)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_deductions_employee_id ON payroll_deductions(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_employee_id ON payroll_bonuses(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status)'
    ]

    for (const index of indexes) {
      try {
        await pool.query(index)
      } catch (error) {
        console.log(`   ⚠️  Index already exists or error: ${error.message}`)
      }
    }

    // Insert default settings
    console.log('📝 Inserting default settings...')
    await pool.query(`
      INSERT INTO payroll_settings (setting_key, setting_value, description) VALUES
      ('default_base_salary', '20000', 'Default base salary in PKR'),
      ('overtime_rate_multiplier', '1.5', 'Overtime pay multiplier'),
      ('max_regular_hours', '40', 'Maximum regular hours per week'),
      ('payroll_currency', 'PKR', 'Default currency for payroll'),
      ('tax_rate', '0.05', 'Default tax rate (5%)'),
      ('performance_bonus_threshold', '4.5', 'Performance rating threshold for bonus'),
      ('late_deduction_amount', '500', 'Deduction amount for late arrivals'),
      ('no_show_deduction_amount', '1000', 'Deduction amount for no-shows')
      ON CONFLICT (setting_key) DO NOTHING
    `)

    console.log('✅ Payroll system migration completed successfully!')

    // Verify tables were created
    console.log('🔍 Verifying tables...')
    const tables = [
      'employee_salaries',
      'payroll_periods', 
      'payroll_records',
      'payroll_deductions',
      'payroll_bonuses',
      'payroll_settings'
    ]

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table}`)
        console.log(`   ✅ ${table}: ${result.rows[0].count} records`)
      } catch (error) {
        console.error(`   ❌ ${table}: Error - ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ Error running payroll migration:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
runPayrollMigration()
