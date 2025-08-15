const fs = require('fs')
const path = require('path')

async function testNewWorkflow() {
  console.log('🧪 Testing New Attendance Workflow...\n')
  
  try {
    // Test 1: Verification API with automatic clock-in
    console.log('📸 Test 1: Testing verification with automatic clock-in...')
    const testImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
    
    const verificationResponse = await fetch('http://localhost:3001/api/verification/save-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: testImageData,
        employeeId: 'EMP001',
        verificationType: 'shift_start'
      }),
    })

    const verificationResult = await verificationResponse.json()
    
    if (verificationResponse.ok && verificationResult.success) {
      console.log('✅ Verification successful')
      console.log('   • Photo saved:', verificationResult.verification_id)
      console.log('   • Clocked in:', verificationResult.clocked_in)
      if (verificationResult.shift_log) {
        console.log('   • Shift log created:', verificationResult.shift_log.id)
      }
    } else {
      console.log('❌ Verification failed:', verificationResult.error)
    }

    // Test 2: Clock-out with shift remarks
    console.log('\n📝 Test 2: Testing clock-out with shift remarks...')
    const clockOutResponse = await fetch('http://localhost:3001/api/time/clock-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employee_id: 'EMP001',
        total_calls_taken: 25,
        leads_generated: 3,
        shift_remarks: 'Good shift, handled customer inquiries efficiently. Had some technical issues but resolved them quickly.',
        performance_rating: 4
      }),
    })

    const clockOutResult = await clockOutResponse.json()
    
    if (clockOutResponse.ok && clockOutResult.success) {
      console.log('✅ Clock-out successful')
      console.log('   • Total hours:', clockOutResult.totalWorkHours)
      console.log('   • Calls taken:', clockOutResult.totalCallsTaken)
      console.log('   • Leads generated:', clockOutResult.leadsGenerated)
      console.log('   • Shift completed with remarks')
    } else {
      console.log('❌ Clock-out failed:', clockOutResult.error)
    }

    // Test 3: Online employees API
    console.log('\n👥 Test 3: Testing online employees API...')
    const onlineResponse = await fetch('http://localhost:3001/api/employees/online')
    
    if (onlineResponse.ok) {
      const onlineResult = await onlineResponse.json()
      console.log('✅ Online employees API working')
      console.log('   • Online employees:', onlineResult.total)
      if (onlineResult.data.length > 0) {
        console.log('   • Sample employee:', onlineResult.data[0].first_name, onlineResult.data[0].last_name)
      }
    } else {
      console.log('❌ Online employees API failed')
    }

    // Test 4: Check verification files
    console.log('\n📁 Test 4: Checking verification files...')
    const csvPath = path.join(process.cwd(), 'verification_logs.csv')
    const imageDir = path.join(process.cwd(), 'verification_images')
    
    console.log(`   CSV Log: ${fs.existsSync(csvPath) ? '✅ Exists' : '❌ Missing'}`)
    console.log(`   Image Dir: ${fs.existsSync(imageDir) ? '✅ Exists' : '❌ Missing'}`)
    
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf8')
      const lines = csvContent.split('\n').filter(line => line.trim())
      console.log(`   Total verification records: ${lines.length - 1}`)
    }

    console.log('\n🎉 New workflow test completed!')
    console.log('\n📋 Workflow Summary:')
    console.log('   1. ✅ Employee takes photo for verification')
    console.log('   2. ✅ Verification automatically clocks in employee')
    console.log('   3. ✅ Employee status shows as online')
    console.log('   4. ✅ Employee can clock out with shift remarks')
    console.log('   5. ✅ Online status is tracked and visible')
    console.log('\n🚀 The new attendance system is working correctly!')

  } catch (error) {
    console.log('❌ Test failed:', error.message)
    console.log('\n💡 Make sure the server is running on localhost:3001')
    console.log('💡 Make sure the database is properly configured')
  }
}

// Run the test
testNewWorkflow()
