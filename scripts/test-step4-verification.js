const fetch = require('node-fetch');

async function testStep4Verification() {
  try {
    console.log('🧪 Testing step 4 verification...');
    
    const testData = {
      imageData: 'data:image/jpeg;base64,test',
      employeeId: 'james.taylor@rotacloud.com',
      verificationType: 'shift_start'
    };
    
    console.log('📤 Sending request to /api/test-verification-step4...');
    
    const response = await fetch('http://localhost:3000/api/test-verification-step4', {
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
      console.log('✅ Step 4 verification successful!');
    } else {
      console.log('❌ Step 4 verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testStep4Verification().catch(console.error);
