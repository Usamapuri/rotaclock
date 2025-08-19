// Import compiled runtime via ts-node transpile or use dynamic import fallback
let createNotification, sendBroadcastToAllEmployees
try {
  ({ createNotification, sendBroadcastToAllEmployees } = require('../lib/notification-service'))
} catch (e) {
  // Fallback to API calls if module cannot be required in Node directly
  const fetch = require('node-fetch')
  createNotification = async (payload) => {
    const res = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'authorization': 'Bearer demo' },
      body: JSON.stringify(payload)
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to create notification')
    return body.data
  }
  sendBroadcastToAllEmployees = async (message) => {
    const res = await fetch('http://localhost:3000/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'authorization': 'Bearer demo' },
      body: JSON.stringify({ message, sendToAll: true })
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Failed to send broadcast')
    return body.notifications || []
  }
}

async function testNotifications() {
  try {
    console.log('🧪 Testing notification system...')

    // Test 1: Create a broadcast message
    console.log('\n📢 Testing broadcast message...')
    const broadcastResult = await sendBroadcastToAllEmployees('Welcome to the new notification system! This is a test broadcast message.')
    console.log(`✅ Broadcast sent to ${broadcastResult.length} employees`)

    // Test 2: Create individual notifications
    console.log('\n🔔 Testing individual notifications...')
    
    // Use known seeded employee IDs (EMP001, EMP002)
    const employeeIds = [
      '3a6f7885-143e-40f0-80f9-a37605744fe1',
      '047a2a7d-7ef2-4f6a-9823-86ca9a88fa32'
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
