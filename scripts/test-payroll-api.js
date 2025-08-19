const fetch = require('node-fetch')

async function testPayrollAPI() {
  try {
    console.log('🧪 Testing payroll calculation API endpoint...\n')
    
    // Get the latest payroll period ID
    const periodsResponse = await fetch('http://localhost:3000/api/admin/payroll/periods')
    const periods = await periodsResponse.json()
    
    if (!periods || periods.length === 0) {
      console.log('❌ No payroll periods found')
      return
    }
    
    const latestPeriod = periods[0] // Most recent period
    console.log(`📅 Using payroll period: ${latestPeriod.period_name} (ID: ${latestPeriod.id})`)
    
    // Test the calculate payroll API
    console.log('\n🔄 Calling payroll calculation API...')
    const calculateResponse = await fetch(`http://localhost:3000/api/admin/payroll/calculate?period_id=${latestPeriod.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (calculateResponse.ok) {
      const result = await calculateResponse.json()
      console.log('✅ Payroll calculation successful!')
      console.log(`   Total employees: ${result.total_employees}`)
      console.log(`   Total amount: PKR ${result.total_amount}`)
      console.log(`   Message: ${result.message}`)
    } else {
      const error = await calculateResponse.text()
      console.log(`❌ Payroll calculation failed: ${error}`)
    }
    
    // Check the payroll records
    console.log('\n📊 Checking payroll records...')
    const recordsResponse = await fetch(`http://localhost:3000/api/admin/payroll/records?period_id=${latestPeriod.id}`)
    
    if (recordsResponse.ok) {
      const records = await recordsResponse.json()
      console.log(`✅ Found ${records.length} payroll records`)
      
      if (records.length > 0) {
        console.log('\n📋 Sample payroll records:')
        records.slice(0, 3).forEach((record, index) => {
          console.log(`   Record ${index + 1}:`)
          console.log(`     Employee: ${record.employee_name}`)
          console.log(`     Base salary: PKR ${record.base_salary}`)
          console.log(`     Hours worked: ${record.hours_worked}`)
          console.log(`     Overtime hours: ${record.overtime_hours}`)
          console.log(`     Bonuses: PKR ${record.bonus_amount}`)
          console.log(`     Deductions: PKR ${record.deductions_amount}`)
          console.log(`     Net pay: PKR ${record.net_pay}`)
          console.log(`     Status: ${record.payment_status}`)
        })
      }
    } else {
      const error = await recordsResponse.text()
      console.log(`❌ Failed to fetch payroll records: ${error}`)
    }
    
    console.log('\n✅ Payroll API test completed!')
    
  } catch (error) {
    console.error('❌ Error testing payroll API:', error.message)
    console.log('\n💡 Make sure your Next.js development server is running on http://localhost:3000')
  }
}

testPayrollAPI()
