const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tIxWwsJpAlklxQGfDbxtDEheAxQmBlbz@maglev.proxy.rlwy.net:36050/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

const query = async (text, params) => {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

const analyzeEmailVsDualId = async () => {
  try {
    console.log('🔍 Analyzing Email vs Dual ID System...\n')
    
    // Check current email uniqueness
    console.log('📧 EMAIL ANALYSIS:')
    const emailResult = await query(`
      SELECT 
        email,
        COUNT(*) as count,
        array_agg(employee_id) as employee_ids
      FROM employees 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `)
    
    if (emailResult.rows.length === 0) {
      console.log('✅ All emails are unique!')
    } else {
      console.log('❌ Duplicate emails found:')
      emailResult.rows.forEach(row => {
        console.log(`   ${row.email}: ${row.employee_ids.join(', ')}`)
      })
    }
    
    // Check email format consistency
    const emailFormatResult = await query(`
      SELECT 
        email,
        employee_id,
        first_name,
        last_name
      FROM employees 
      ORDER BY email
    `)
    
    console.log('\n📋 Email format examples:')
    emailFormatResult.rows.slice(0, 5).forEach(row => {
      console.log(`   ${row.employee_id}: ${row.email}`)
    })
    
    // Analyze current dual ID complexity
    console.log('\n🔄 DUAL ID SYSTEM COMPLEXITY:')
    
    // Count tables using each ID type
    const tablesUsingUUID = ['shift_logs']
    const tablesUsingStringId = ['payroll_records', 'payroll_bonuses', 'payroll_deductions']
    
    console.log(`Tables using UUID: ${tablesUsingUUID.length}`)
    console.log(`Tables using String ID: ${tablesUsingStringId.length}`)
    
    // Check for potential join issues
    console.log('\n🔗 JOIN COMPLEXITY ANALYSIS:')
    
    // Example of complex join needed with dual IDs
    console.log('Current complex join example:')
    console.log(`
      SELECT 
        e.employee_id,
        e.first_name,
        e.last_name,
        sl.total_shift_hours,
        pr.net_pay
      FROM employees e
      LEFT JOIN shift_logs sl ON e.id = sl.employee_id  -- UUID join
      LEFT JOIN payroll_records pr ON e.employee_id = pr.employee_id  -- String join
    `)
    
    // Simpler join with email
    console.log('\nSimpler join with email:')
    console.log(`
      SELECT 
        e.email,
        e.first_name,
        e.last_name,
        sl.total_shift_hours,
        pr.net_pay
      FROM employees e
      LEFT JOIN shift_logs sl ON e.email = sl.employee_email
      LEFT JOIN payroll_records pr ON e.email = pr.employee_email
    `)
    
    // API complexity analysis
    console.log('\n🌐 API COMPLEXITY:')
    console.log('Current API endpoints need to handle:')
    console.log('1. UUID for shift_logs operations')
    console.log('2. String ID for payroll operations')
    console.log('3. Conversion between UUID and String ID')
    console.log('4. Different parameter names in different endpoints')
    
    console.log('\nWith email-based system:')
    console.log('1. Single identifier for all operations')
    console.log('2. No ID conversion needed')
    console.log('3. Consistent parameter naming')
    console.log('4. Human-readable and memorable')
    
    // Performance implications
    console.log('\n⚡ PERFORMANCE IMPLICATIONS:')
    
    // Check current index usage
    const indexResult = await query(`
      SELECT 
        indexname,
        tablename,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('employees', 'shift_logs', 'payroll_records')
      AND indexname LIKE '%employee%'
    `)
    
    console.log('Current indexes on employee fields:')
    indexResult.rows.forEach(row => {
      console.log(`   ${row.tablename}.${row.indexname}: ${row.indexdef}`)
    })
    
    // Storage comparison
    console.log('\n💾 STORAGE COMPARISON:')
    console.log('UUID: 36 characters per reference')
    console.log('String ID: ~6 characters per reference')
    console.log('Email: ~25 characters per reference')
    console.log('Total records with employee references: ~200')
    console.log('Storage difference: ~6KB vs ~5KB vs ~5KB')
    
    // Security considerations
    console.log('\n🔒 SECURITY CONSIDERATIONS:')
    console.log('UUID:')
    console.log('   ✅ No business information exposed')
    console.log('   ✅ Hard to guess')
    console.log('   ❌ Not human-readable')
    
    console.log('String ID:')
    console.log('   ⚠️  Exposes department/role information')
    console.log('   ⚠️  Predictable pattern')
    console.log('   ✅ Human-readable')
    
    console.log('Email:')
    console.log('   ⚠️  Exposes personal information')
    console.log('   ⚠️  Can be used for phishing')
    console.log('   ✅ Natural identifier')
    console.log('   ✅ Already used for authentication')
    
    // Migration complexity
    console.log('\n🔄 MIGRATION COMPLEXITY:')
    console.log('Current dual ID system:')
    console.log('   ❌ Complex joins across tables')
    console.log('   ❌ API parameter confusion')
    console.log('   ❌ Maintenance overhead')
    console.log('   ✅ No migration needed')
    
    console.log('Email-based system:')
    console.log('   ✅ Simple, consistent joins')
    console.log('   ✅ Unified API parameters')
    console.log('   ✅ Easier maintenance')
    console.log('   ❌ Requires migration')
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('1. EMAIL-BASED SYSTEM (Recommended):')
    console.log('   - Use email as the primary business identifier')
    console.log('   - Keep UUID as internal primary key')
    console.log('   - Add email field to all related tables')
    console.log('   - Update APIs to use email parameter')
    console.log('   - Benefits: Simplicity, consistency, natural identifier')
    
    console.log('\n2. HYBRID APPROACH:')
    console.log('   - Keep current dual system')
    console.log('   - Add email as alternative identifier')
    console.log('   - Gradually migrate APIs to use email')
    console.log('   - Benefits: No breaking changes, gradual improvement')
    
    console.log('\n3. UUID-ONLY SYSTEM:')
    console.log('   - Migrate all tables to use UUID')
    console.log('   - Remove string employee_id')
    console.log('   - Benefits: Consistency, security')
    console.log('   - Drawbacks: Not human-readable, complex migration')
    
  } catch (error) {
    console.error('❌ Error analyzing email vs dual ID:', error)
  } finally {
    await pool.end()
  }
}

analyzeEmailVsDualId()
