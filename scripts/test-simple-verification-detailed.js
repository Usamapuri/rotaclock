const fetch = require('node-fetch');

async function testSimpleVerificationDetailed() {
  try {
    console.log('🧪 Testing detailed simple verification...');
    
    const testData = {
      imageData: 'data:image/jpeg;base64,test',
      employeeId: 'james.taylor@rotacloud.com',
      verificationType: 'shift_start'
    };
    
    console.log('📤 Sending request to /api/test-verification-simple...');
    
    const response = await fetch('http://localhost:3000/api/test-verification-simple', {
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
      console.log('✅ Detailed simple verification successful!');
    } else {
      console.log('❌ Detailed simple verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testSimpleVerificationDetailed().catch(console.error);
