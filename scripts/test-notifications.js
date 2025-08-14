const { createNotification, sendBroadcastToAllEmployees } = require('../lib/notification-service')

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...')

    // Test 1: Create a broadcast message
    console.log('\n📢 Testing broadcast message...')
    const broadcastResult = await sendBroadcastToAllEmployees('Welcome to the new notification system! This is a test broadcast message.')
    console.log(`✅ Broadcast sent to ${broadcastResult.length} employees`)

    // Test 2: Create individual notifications
    console.log('\n🔔 Testing individual notifications...')
    
    // Get some employee IDs (you'll need to replace these with actual IDs from your database)
    const employeeIds = [
      '550e8400-e29b-41d4-a716-446655440000', // Replace with actual employee ID
      '550e8400-e29b-41d4-a716-446655440001'  // Replace with actual employee ID
    ]

    for (const employeeId of employeeIds) {
      try {
        // Test shift assignment notification
        await createNotification({
          user_id: employeeId,
          title: 'New Shift Assigned',
          message: 'You have been assigned a new shift for tomorrow from 9:00 AM to 5:00 PM.',
          type: 'shift_assigned',
          read: false,
          action_url: '/employee/scheduling',
          priority: 'high'
        })

        // Test leave request notification
        await createNotification({
          user_id: employeeId,
          title: 'Leave Request Approved',
          message: 'Your vacation request for next week has been approved.',
          type: 'leave',
          read: false,
          priority: 'normal'
        })

        // Test swap request notification
        await createNotification({
          user_id: employeeId,
          title: 'Shift Swap Request',
          message: 'John Doe has requested to swap shifts with you on Friday.',
          type: 'swap',
          read: false,
          action_url: '/employee/scheduling',
          priority: 'high'
        })

        console.log(`✅ Created notifications for employee ${employeeId}`)
      } catch (error) {
        console.error(`❌ Error creating notifications for employee ${employeeId}:`, error.message)
      }
    }

    console.log('\n🎉 Notification system test completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Check the employee dashboard for the notification bell')
    console.log('2. Test the broadcast message functionality from admin dashboard')
    console.log('3. Test approving/denying leave and swap requests')
    console.log('4. Verify notifications appear in the dropdown')

  } catch (error) {
    console.error('❌ Error testing notifications:', error)
  }
}

// Run the test
testNotifications()
