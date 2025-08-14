const fs = require('fs');
const path = require('path');

// Test data
const testImageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function testVerificationAPI() {
  console.log('🧪 Testing Verification API...\n');
  
  try {
    // Test the verification API endpoint
    const response = await fetch('http://localhost:3001/api/verification/save-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: testImageData,
        employeeId: 'EMP001',
        verificationType: 'shift_start'
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Verification API test successful!');
      console.log('Response:', result);
    } else {
      console.log('❌ Verification API test failed');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.log('❌ Error testing verification API:', error.message);
  }
  
  // Check if files were created
  console.log('\n📁 Checking if files were created:');
  const csvPath = path.join(process.cwd(), 'verification_logs.csv');
  const imageDir = path.join(process.cwd(), 'verification_images');
  
  console.log(`   CSV Log: ${fs.existsSync(csvPath) ? '✅ Created' : '❌ Not created'}`);
  console.log(`   Image Dir: ${fs.existsSync(imageDir) ? '✅ Created' : '❌ Not created'}`);
  
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf8');
    console.log('\n📊 CSV Content:');
    console.log(content);
  }
  
  if (fs.existsSync(imageDir)) {
    const files = fs.readdirSync(imageDir);
    console.log('\n📸 Image files:');
    files.forEach(file => console.log(`   - ${file}`));
  }
}

// Run the test
testVerificationAPI();
