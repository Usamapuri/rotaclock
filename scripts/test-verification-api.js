const fetch = require('node-fetch');

async function testVerificationAPI() {
  try {
    console.log('🧪 Testing verification API directly...');
    
    // Test data
    const testData = {
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
      employeeId: 'james.taylor@rotacloud.com',
      verificationType: 'shift_start'
    };
    
    console.log('📤 Sending verification request...');
    console.log('   Employee ID:', testData.employeeId);
    console.log('   Image data length:', testData.imageData.length);
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/verification/save-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      const responseData = JSON.parse(responseText);
      console.log('✅ Verification successful!');
      console.log('   Response data:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ Verification failed!');
      console.log('   Error response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error testing verification API:', error);
  }
}

// Run the test
testVerificationAPI().catch(console.error);
