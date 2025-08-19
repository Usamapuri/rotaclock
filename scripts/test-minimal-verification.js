const fetch = require('node-fetch');

async function testMinimalVerification() {
  try {
    console.log('🧪 Testing minimal verification endpoint...');
    
    const testData = {
      imageData: 'data:image/jpeg;base64,test',
      employeeId: 'james.taylor@rotacloud.com',
      verificationType: 'shift_start'
    };
    
    console.log('📤 Sending request to /api/test-verification...');
    
    const response = await fetch('http://localhost:3000/api/test-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📥 Status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Response:', responseText);
    
    if (response.ok) {
      console.log('✅ Minimal verification successful!');
    } else {
      console.log('❌ Minimal verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testMinimalVerification().catch(console.error);
