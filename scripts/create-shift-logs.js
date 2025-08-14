const { Pool } = require('pg');

// Database configuration - matching the Railway database used in the app
const pool = new Pool({
  host: 'maglev.proxy.rlwy.net',
  port: 36050,
  database: 'railway',
  user: 'postgres',
  password: 'tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz',
  ssl: {
    rejectUnauthorized: false
  }
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

const createShiftLogsTables = async () => {
  try {
    console.log('🔄 Creating shift logs tables...');
    
    // Create shift logs table
    await query(`
      CREATE TABLE IF NOT EXISTS shift_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        shift_assignment_id UUID REFERENCES shift_assignments(id) ON DELETE SET NULL,
        clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
        clock_out_time TIMESTAMP WITH TIME ZONE,
        total_shift_hours DECIMAL(5,2),
        break_time_used DECIMAL(5,2) DEFAULT 0,
        max_break_allowed DECIMAL(5,2) DEFAULT 1.0,
        is_late BOOLEAN DEFAULT FALSE,
        is_no_show BOOLEAN DEFAULT FALSE,
        late_minutes INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create break logs table
    await query(`
      CREATE TABLE IF NOT EXISTS break_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shift_log_id UUID NOT NULL REFERENCES shift_logs(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        break_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        break_end_time TIMESTAMP WITH TIME ZONE,
        break_duration DECIMAL(5,2),
        break_type VARCHAR(20) DEFAULT 'lunch',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Create attendance summary table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_shifts INTEGER DEFAULT 0,
        total_hours_worked DECIMAL(5,2) DEFAULT 0,
        total_break_time DECIMAL(5,2) DEFAULT 0,
        late_count INTEGER DEFAULT 0,
        no_show_count INTEGER DEFAULT 0,
        on_time_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(employee_id, date)
      );
    `);
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_shift_logs_employee_id ON shift_logs(employee_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_shift_logs_clock_in_time ON shift_logs(clock_in_time);');
    await query('CREATE INDEX IF NOT EXISTS idx_break_logs_shift_log_id ON break_logs(shift_log_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_break_logs_employee_id ON break_logs(employee_id);');
    await query('CREATE INDEX IF NOT EXISTS idx_attendance_summary_employee_date ON attendance_summary(employee_id, date);');
    
    console.log('✅ Shift logs tables created successfully!');
    console.log('📋 Tables created:');
    console.log('   - shift_logs (tracks shift sessions)');
    console.log('   - break_logs (tracks individual breaks)');
    console.log('   - attendance_summary (daily attendance reports)');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error creating shift logs tables:', error);
    await pool.end();
  }
};

createShiftLogsTables();
