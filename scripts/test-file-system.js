const fs = require('fs');
const path = require('path');

async function testFileSystem() {
  try {
    console.log('🧪 Testing file system operations...');
    
    const cwd = process.cwd();
    console.log('📁 Current working directory:', cwd);
    
    // Test 1: Check if verification_images directory exists
    const imageDir = path.join(cwd, 'verification_images');
    console.log('\n1️⃣ Testing verification_images directory...');
    console.log('   Path:', imageDir);
    console.log('   Exists:', fs.existsSync(imageDir));
    
    if (!fs.existsSync(imageDir)) {
      console.log('   Creating directory...');
      try {
        fs.mkdirSync(imageDir, { recursive: true });
        console.log('   ✅ Directory created successfully');
      } catch (error) {
        console.log('   ❌ Failed to create directory:', error.message);
        return;
      }
    }
    
    // Test 2: Check if verification_logs.csv exists
    const csvPath = path.join(cwd, 'verification_logs.csv');
    console.log('\n2️⃣ Testing verification_logs.csv...');
    console.log('   Path:', csvPath);
    console.log('   Exists:', fs.existsSync(csvPath));
    
    if (!fs.existsSync(csvPath)) {
      console.log('   Creating CSV file...');
      try {
        const csvHeader = 'employee_id,user_id,verification_type,timestamp,status\n';
        fs.writeFileSync(csvPath, csvHeader);
        console.log('   ✅ CSV file created successfully');
      } catch (error) {
        console.log('   ❌ Failed to create CSV file:', error.message);
        return;
      }
    }
    
    // Test 3: Test writing to CSV
    console.log('\n3️⃣ Testing CSV write operation...');
    try {
      const csvRow = 'TEST001,test-user,test-verification,2025-08-17T15:45:00.000Z,verified\n';
      fs.appendFileSync(csvPath, csvRow);
      console.log('   ✅ CSV write successful');
    } catch (error) {
      console.log('   ❌ Failed to write to CSV:', error.message);
      return;
    }
    
    // Test 4: Test writing image file
    console.log('\n4️⃣ Testing image file write...');
    try {
      const imageFileName = `test_verification_${Date.now()}.txt`;
      const imagePath = path.join(imageDir, imageFileName);
      const imageData = 'test-image-data';
      fs.writeFileSync(imagePath, imageData);
      console.log('   ✅ Image file write successful');
      console.log('   File:', imagePath);
    } catch (error) {
      console.log('   ❌ Failed to write image file:', error.message);
      return;
    }
    
    // Test 5: Check file permissions
    console.log('\n5️⃣ Testing file permissions...');
    try {
      const testFile = path.join(cwd, 'test_permissions.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('   ✅ File permissions OK');
    } catch (error) {
      console.log('   ❌ File permission issue:', error.message);
      return;
    }
    
    console.log('\n🎉 All file system tests passed!');
    
  } catch (error) {
    console.error('❌ File system test failed:', error);
  }
}

// Run the test
testFileSystem().catch(console.error);
