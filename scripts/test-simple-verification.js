const fetch = require('node-fetch');

async function testSimpleVerification() {
  try {
    console.log('🧪 Testing simple verification...');
    
    // Test with minimal data
    const testData = {
      imageData: 'data:image/jpeg;base64,test',
      employeeId: 'james.taylor@rotacloud.com',
      verificationType: 'shift_start'
    };
    
    console.log('📤 Sending request...');
    
    const response = await fetch('http://localhost:3000/api/verification/save-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('📥 Status:', response.status);
    
    let responseText;
    try {
      responseText = await response.text();
      console.log('📥 Response:', responseText);
    } catch (e) {
      console.log('📥 Could not read response:', e.message);
    }
    
    if (response.ok) {
      console.log('✅ Success!');
    } else {
      console.log('❌ Failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

// Run the test
testSimpleVerification().catch(console.error);
