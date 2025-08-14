const { getNotifications, createNotification } = require('./lib/notification-service')

async function testNotificationService() {
  console.log('🧪 Testing notification service...')
  
  try {
    const userId = '3cae45f4-f119-41d2-b24f-66a7249cf974'
    
    console.log('1. Testing getNotifications...')
    const notifications = await getNotifications(userId, { limit: 10 })
    console.log(`✅ Found ${notifications.length} notifications`)
    
    console.log('2. Testing createNotification...')
    const newNotification = await createNotification({
      user_id: userId,
      title: 'Test Service Notification',
      message: 'This is a test notification from the service',
      type: 'info',
      read: false
    })
    console.log('✅ Created notification:', newNotification.id)
    
    console.log('3. Testing getNotifications again...')
    const updatedNotifications = await getNotifications(userId, { limit: 10 })
    console.log(`✅ Now found ${updatedNotifications.length} notifications`)
    
    console.log('✅ All notification service tests passed!')
    
  } catch (error) {
    console.error('❌ Error testing notification service:', error.message)
    console.error('Full error:', error)
  }
}

testNotificationService()
