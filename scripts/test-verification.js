const fs = require('fs');
const path = require('path');

function testVerificationSystem() {
  console.log('🧪 Testing Verification System...\n');
  
  // Check if verification files exist
  const csvPath = path.join(process.cwd(), 'verification_logs.csv');
  const imageDir = path.join(process.cwd(), 'verification_images');
  
  console.log('📁 Checking verification files:');
  console.log(`   CSV Log: ${fs.existsSync(csvPath) ? '✅ Exists' : '❌ Missing'}`);
  console.log(`   Image Dir: ${fs.existsSync(imageDir) ? '✅ Exists' : '❌ Missing'}`);
  
  if (fs.existsSync(csvPath)) {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`\n📊 Verification Logs (${lines.length - 1} entries):`);
    if (lines.length > 1) {
      console.log('   Header:', lines[0]);
      console.log('   Latest Entry:', lines[lines.length - 1]);
    }
  }
  
  if (fs.existsSync(imageDir)) {
    const imageFiles = fs.readdirSync(imageDir).filter(file => file.endsWith('.txt'));
    console.log(`\n📸 Verification Images: ${imageFiles.length} files`);
    if (imageFiles.length > 0) {
      console.log('   Latest images:');
      imageFiles.slice(-3).forEach(file => {
        console.log(`     - ${file}`);
      });
    }
  }
  
  console.log('\n✅ Verification system test completed!');
  console.log('\n📋 To test the full flow:');
  console.log('   1. Login as an employee (EMP001 / john123)');
  console.log('   2. Click "Start Shift with Verification"');
  console.log('   3. Take a photo when prompted');
  console.log('   4. Verify the photo is saved and clock in works');
}

// Run the test
testVerificationSystem();
