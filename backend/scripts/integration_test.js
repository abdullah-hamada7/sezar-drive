const request = require('supertest');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/v1';

// Helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 Starting Integration Tests...');
  const agent = request(API_URL);
  
  // 1. Admin Login
  console.log('\nTesting Admin Login...');
  let adminToken;
  try {
    const res = await agent.post('/auth/login')
      .send({ email: 'hossam@sezar.com', password: 'Hossam@2026' }); // Correct from seed.js
      
    if (res.status !== 200) {
        // Try 'password123' if admin123 fails, checks seed.js content
        throw new Error(`Admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    adminToken = res.body.token;
    console.log('✅ Admin Login Successful');
  } catch (e) {
    console.error('❌ Admin Login Failed:', e.message);
    process.exit(1);
  }

  // 2. Create Driver
  console.log('\nTesting Create Driver...');
  const driverEmail = `testdriver_${Date.now()}@test.com`;
  let driverId;
  let driverPassword = 'TempPassword123!';
  
  try {
    const res = await agent.post('/drivers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Driver',
        email: driverEmail,
        phone: `+1555${Math.floor(Math.random() * 10000000)}`,
        licenseNumber: `LIC-${Date.now()}`,
        temporaryPassword: 'TempPassword123!'
      });
      
    if (res.status !== 201) throw new Error(`Create Driver failed: ${res.status} ${JSON.stringify(res.body)}`);
    driverId = res.body.id; // API returns driver object directly
    console.log('✅ Driver Created:', driverId);
  } catch (e) {
    console.error('❌ Create Driver Failed:', e.message);
    process.exit(1);
  }

  // 3. Driver Login & Change Password
  console.log('\nTesting Driver Login (First Time)...');
  let driverToken;
  try {
    const res = await agent.post('/auth/login')
      .send({ email: driverEmail, password: driverPassword });
      
    if (res.status !== 200) throw new Error(`Driver login failed: ${res.status}`);
    driverToken = res.body.token;
    console.log('✅ Driver Login Successful (Change Password Required)');
    
    // Change Password
    const newPassword = 'NewPassword123!';
    const changeRes = await agent.post('/auth/change-password')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ currentPassword: driverPassword, newPassword });
      
    if (changeRes.status !== 200) throw new Error(`Change password failed: ${changeRes.status}`);
    console.log('✅ Password Changed');
    
    // Re-login
    const loginRes = await agent.post('/auth/login')
        .send({ email: driverEmail, password: newPassword });
    driverToken = loginRes.body.token;
     console.log('✅ Re-login Successful');
  } catch (e) {
    console.error('❌ Driver Setup Failed:', e.message);
    process.exit(1);
  }

  // 4. Identity Verification
  console.log('\nTesting Identity Verification...');
  try {
    // Create dummy file
    const dummyPath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyPath, 'fake image content');
    
    // Upload Identity
    const uploadRes = await agent.post('/auth/identity/upload')
      .set('Authorization', `Bearer ${driverToken}`)
      .attach('photo', dummyPath);
      
    if (uploadRes.status !== 201) throw new Error(`Identity Upload failed: ${uploadRes.status} ${JSON.stringify(uploadRes.body)}`);
    console.log('✅ Identity Uploaded');
    
    // Admin Approve (Use driverId which is same as userId)
    const approveRes = await agent.post(`/auth/identity/${driverId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'approve' });
      
    if (approveRes.status !== 200) throw new Error(`Identity Approve failed: ${approveRes.status} ${JSON.stringify(approveRes.body)}`);
    console.log('✅ Identity Approved');
    
    fs.unlinkSync(dummyPath);
  } catch (e) {
    console.error('❌ Identity Flow Failed:', e.message);
    process.exit(1);
  }

  // 5. Shift Flow: Start -> Reject -> Check -> Retry
  console.log('\nTesting Shift Rejection Flow...');
  try {
     // Create dummy file
    const dummyPath = path.join(__dirname, 'selfie.jpg');
    fs.writeFileSync(dummyPath, 'fake selfie content');

    // 5a. Start Shift (Pending)
    const startRes = await agent.post('/verification/shift-selfie')
        .set('Authorization', `Bearer ${driverToken}`)
        .attach('photo', dummyPath);
        
    if (startRes.status !== 200) throw new Error(`Start Shift failed: ${startRes.status} ${JSON.stringify(startRes.body)}`);
    const shiftId = startRes.body.shiftId;
    console.log('✅ Shift Started (Pending):', shiftId);
    
    // 5b. Admin Reject
    const rejectRes = await agent.post('/verification/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ shiftId, decision: 'REJECT', reason: 'Blurry photo' });
        
    if (rejectRes.status !== 200) throw new Error(`Shift Reject failed: ${rejectRes.status} ${JSON.stringify(rejectRes.body)}`);
    console.log('✅ Shift Rejected');
    
    // 5c. Driver Check Last Shift (The Fix Verification)
    const lastShiftRes = await agent.get('/shifts/last')
        .set('Authorization', `Bearer ${driverToken}`);
        
    const lastShift = lastShiftRes.body.shift;
    if (!lastShift || lastShift.id !== shiftId || lastShift.verificationStatus !== 'REJECTED') {
        throw new Error(`Last shift verification failed. Got: ${JSON.stringify(lastShift)}`);
    }
    console.log('✅ Verified "Last Shift" is Rejected');
    
    // 5d. Retry Start Shift
    const retryRes = await agent.post('/verification/shift-selfie')
        .set('Authorization', `Bearer ${driverToken}`)
        .attach('photo', dummyPath);
        
    if (retryRes.status !== 200) throw new Error(`Retry Shift failed: ${retryRes.status}`);
    const newShiftId = retryRes.body.shiftId;
    console.log('✅ Retry Shift Successful:', newShiftId);
    
    // 5e. Admin Approve
    const approveShiftRes = await agent.post('/verification/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ shiftId: newShiftId, decision: 'APPROVE' });
        
    if (approveShiftRes.status !== 200) throw new Error(`Shift Approve failed: ${approveShiftRes.status}`);
    console.log('✅ Shift Approved & Active');

    fs.unlinkSync(dummyPath);
  } catch (e) {
     console.error('❌ Shift Flow Failed:', e.message);
     process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED!');
}

runTests();
