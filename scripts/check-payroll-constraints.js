const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkPayrollConstraints() {
  try {
    console.log('🔍 Checking payroll_records table constraints...\n')
    
    // Check table structure
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payroll_records' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Payroll records table columns:')
    structureResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    
    // Check constraints
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'payroll_records'
    `)
    
    console.log('\n🔒 Payroll records table constraints:')
    constraintsResult.rows.forEach(row => {
      console.log(`   ${row.constraint_type}: ${row.constraint_name}`)
      if (row.column_name) {
        console.log(`     Column: ${row.column_name}`)
      }
      if (row.foreign_table_name) {
        console.log(`     References: ${row.foreign_table_name}.${row.foreign_column_name}`)
      }
    })
    
    // Check if the unique constraint exists
    const uniqueConstraintResult = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'payroll_records' 
      AND constraint_type = 'UNIQUE'
    `)
    
    if (uniqueConstraintResult.rows.length > 0) {
      console.log('\n✅ Unique constraint exists on payroll_records')
      uniqueConstraintResult.rows.forEach(row => {
        console.log(`   - ${row.constraint_name}`)
      })
    } else {
      console.log('\n❌ No unique constraint found on payroll_records')
    }
    
    // Test inserting a sample record
    console.log('\n🧪 Testing payroll record insertion...')
    
    // Get a sample employee and period
    const employeeResult = await pool.query(`
      SELECT id, employee_id FROM employees WHERE is_active = true LIMIT 1
    `)
    
    const periodResult = await pool.query(`
      SELECT id FROM payroll_periods LIMIT 1
    `)
    
    if (employeeResult.rows.length > 0 && periodResult.rows.length > 0) {
      const employee = employeeResult.rows[0]
      const period = periodResult.rows[0]
      
      console.log(`   Testing with employee: ${employee.employee_id} (${employee.id})`)
      console.log(`   Testing with period: ${period.id}`)
      
      try {
        const insertResult = await pool.query(`
          INSERT INTO payroll_records (
            employee_id,
            payroll_period_id,
            base_salary,
            hours_worked,
            hourly_pay,
            overtime_hours,
            overtime_pay,
            bonus_amount,
            deductions_amount,
            gross_pay,
            net_pay,
            payment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
          RETURNING id
        `, [
          employee.employee_id, // Use employee_id (VARCHAR) not UUID
          period.id,
          20000,
          40,
          1000,
          0,
          0,
          0,
          0,
          21000,
          21000
        ])
        
        console.log(`   ✅ Successfully inserted record with ID: ${insertResult.rows[0].id}`)
        
        // Clean up test record
        await pool.query(`DELETE FROM payroll_records WHERE id = $1`, [insertResult.rows[0].id])
        console.log('   🧹 Test record cleaned up')
        
      } catch (error) {
        console.log(`   ❌ Insert failed: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkPayrollConstraints()
