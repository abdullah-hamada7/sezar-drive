const prisma = require('./src/config/database');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:3000/api/v1';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  return { status: res.status, data };
}

async function main() {
  console.log('Starting Phase 3 Verification...');

  try {
    // 1. Setup Admin & Generate Token
    const adminEmail = `admin_v3_${Date.now()}@test.com`;
    // Use a placeholder password hash that is valid bcrypt format but we won't use it for login
    // $2a$10$...................... (31 chars?)
    // Actually, we just generate token, so password doesn't matter for login.
    const admin = await prisma.user.create({
      data: {
        name: 'Admin V3',
        email: adminEmail,
        passwordHash: '$2a$10$PcXp.vW8PzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXz', // Dummy valid-ish length
        role: 'admin',
        mustChangePassword: false,
        phone: `+1555${Date.now().toString().slice(-9)}`,
      }
    });
    
    // Generate Token
    const adminToken = jwt.sign(
        { id: admin.id, role: 'admin' }, 
        process.env.JWT_SECRET || 'supersecret', 
        { expiresIn: '1h' }
    );
    console.log('Admin Token obtained');

    // 2. Create Driver via Prisma (Bypassing API to avoid auth issues if any)
    const driverEmail = `driver_v3_${Date.now()}@test.com`;
    const driver = await prisma.user.create({
      data: {
        name: 'Driver V3',
        email: driverEmail,
        passwordHash: '$2a$10$PcXp.vW8PzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXzXz', // Dummy
        role: 'driver',
        mustChangePassword: false,
        phone: `+1666${Date.now().toString().slice(-9)}`,
        identityVerified: true // Set verified to skip upload check if testing shift logic
      }
    });
    const driverId = driver.id;
    console.log('Driver Created (Prisma):', driverId);

    // Generate Driver Token
    const driverToken = jwt.sign(
        { 
            id: driverId, 
            role: 'driver',
            identityVerified: true,
            mustChangePassword: false
        }, 
        process.env.JWT_SECRET || 'supersecret', 
        { expiresIn: '1h' }
    );

    // 3. Create Vehicle (API)
    const vehicleRes = await request('POST', '/vehicles', {
      plateNumber: `V3-${Date.now()}`,
      model: 'Test Car V3',
      year: 2024,
      capacity: 4,
      qrCode: `QR3-${Date.now()}`
    }, adminToken);
    
    if (vehicleRes.status !== 201 && vehicleRes.status !== 200) {
        console.error('Vehicle Creation Failed:', vehicleRes.status, vehicleRes.data);
        throw new Error('Vehicle creation failed');
    }
    const vehicleId = vehicleRes.data.id;
    console.log('Vehicle Created:', vehicleId);

    // 4. Create Shift
    const shiftRes = await request('POST', '/shifts', {}, driverToken);
    // Might fail if shift already exists? New driver, so no.
    const shiftId = shiftRes.data.id;
    console.log('Shift Created:', shiftId, shiftRes.status);

    // 5. Test Filtering (Admin)
    const shiftsRes = await request('GET', '/shifts?status=PendingVerification', null, adminToken);
    const shiftInList = shiftsRes.data.shifts.find(s => s.id === shiftId);
    console.log('Shift in Admin List (before assign):', !!shiftInList);
    
    // 6. Assign Vehicle
    const assignRes = await request('POST', `/vehicles/${vehicleId}/assign`, {
      driverId,
      shiftId
    }, adminToken);
    console.log('Vehicle Assigned:', assignRes.status);

    // 7. Test Filtering (Admin) - Should be filtered out in Helper logic, but API returns it with assignments.
    const shiftsRes2 = await request('GET', '/shifts?status=PendingVerification', null, adminToken);
    const shiftInList2 = shiftsRes2.data.shifts.find(s => s.id === shiftId);
    console.log('Shift in Admin List (after assign):', !!shiftInList2);
    // Check assignments
    if (shiftInList2 && shiftInList2.assignments && shiftInList2.assignments.length > 0) {
        console.log('Verified: Shift has active assignments in API response.');
    } else {
        console.error('Failed: Shift should have assignments.');
    }

    // 8. Test Inspection Enforcement
    // Try Activate
    const activateRes = await request('PUT', `/shifts/${shiftId}/activate`, {}, driverToken);
    console.log('Activate (No Inspection):', activateRes.status, activateRes.data.error); // Expect 409

    // Create Inspection (via Prisma to bypass photo upload or use endpoint if I can mock photos)
    // I can't upload photos via fetch easily here without FormData node polyfill or similar.
    // I'll use Prisma to insert inspection.
    const inspection = await prisma.inspection.create({
      data: {
        driverId,
        shiftId,
        vehicleId,
        type: 'full',
        checklistData: { tires: true },
        status: 'completed'
      }
    });
    console.log('Inspection Created (No Check)');

    // Retry Activate
    const activateRes2 = await request('PUT', `/shifts/${shiftId}/activate`, {}, driverToken);
    console.log('Activate (0 Photos):', activateRes2.status, activateRes2.data.error); // Expect 409

    // Add 4 Photos via Prisma
    await prisma.inspectionPhoto.createMany({
      data: [
        { inspectionId: inspection.id, photoUrl: 'http://foo.com/1.jpg', direction: 'front' },
        { inspectionId: inspection.id, photoUrl: 'http://foo.com/2.jpg', direction: 'back' },
        { inspectionId: inspection.id, photoUrl: 'http://foo.com/3.jpg', direction: 'left' },
        { inspectionId: inspection.id, photoUrl: 'http://foo.com/4.jpg', direction: 'right' },
      ]
    });
    console.log('Photos Added');

    // Retry Activate
    const activateRes3 = await request('PUT', `/shifts/${shiftId}/activate`, {}, driverToken);
    console.log('Activate (4 Photos):', activateRes3.status); // Expect 200

    // 9. Close Shift
    const closeRes = await request('PUT', `/shifts/${shiftId}/close`, {}, driverToken);
    console.log('Close (No End Inspection):', closeRes.status, closeRes.data.error); // Expect 409

    // Create End Inspection
    const endInspection = await prisma.inspection.create({
      data: {
        driverId,
        shiftId,
        vehicleId,
        type: 'full', // or end
        checklistData: { tires: true },
        status: 'completed',
        createdAt: new Date(Date.now() + 10000) // Ensure it's after start
      }
    });
    // Add photos
    await prisma.inspectionPhoto.createMany({
      data: [
        { inspectionId: endInspection.id, photoUrl: 'http://foo.com/1.jpg', direction: 'front' },
        { inspectionId: endInspection.id, photoUrl: 'http://foo.com/2.jpg', direction: 'back' },
        { inspectionId: endInspection.id, photoUrl: 'http://foo.com/3.jpg', direction: 'left' },
        { inspectionId: endInspection.id, photoUrl: 'http://foo.com/4.jpg', direction: 'right' },
      ]
    });

    // Retry Close
    const closeRes2 = await request('PUT', `/shifts/${shiftId}/close`, {}, driverToken);
    console.log('Close (With End Inspection):', closeRes2.status); // Expect 200

  } catch (err) {
    console.error('Verification Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
