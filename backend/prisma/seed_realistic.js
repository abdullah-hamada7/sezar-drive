require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive realistic database seeding...');

  try {
    // 1. Clean existing data
    console.log('  🗑️ Cleaning existing data...');
    await prisma.locationLog.deleteMany();
    await prisma.damagePhoto.deleteMany();
    await prisma.damageReport.deleteMany();
    await prisma.inspectionPhoto.deleteMany();
    await prisma.inspection.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.vehicleAssignment.deleteMany();
    await prisma.identityVerification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.userDevice.deleteMany();
    await prisma.adminConfig.deleteMany();
    await prisma.user.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.expenseCategory.deleteMany();

    // 2. Admin User
    const adminPassword = await bcrypt.hash('Hossam@2026', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'hossam@sezar.com',
        phone: '+966500000001',
        name: 'System Admin',
        passwordHash: adminPassword,
        role: 'admin',
        mustChangePassword: false,
        identityVerified: true,
      },
    });
    console.log(`  ✅ Admin: ${admin.email}`);

    // 3. Vehicles with varied states
    console.log('  🚘 Seeding vehicles...');
    const vehicleData = [
      { plate: 'AAA-1111', model: 'Toyota Camry', year: 2022, status: 'available' },
      { plate: 'BBB-2222', model: 'Toyota Hiace', year: 2021, status: 'available', capacity: 12 },
      { plate: 'CCC-3333', model: 'Hyundai Sonata', year: 2023, status: 'locked' },
      { plate: 'DDD-4444', model: 'Ford Transit', year: 2020, status: 'damaged', capacity: 12 },
      { plate: 'EEE-5555', model: 'Tesla Model 3', year: 2022, status: 'maintenance' },
      { plate: 'FFF-6666', model: 'Toyota Innova', year: 2021, status: 'available' },
      { plate: 'GGG-7777', model: 'Lexus ES', year: 2023, status: 'available' },
      { plate: 'HHH-8888', model: 'Kia Carnival', year: 2022, status: 'available', capacity: 7 },
      { plate: 'III-9999', model: 'Mercedes Sprinter', year: 2021, status: 'maintenance', capacity: 15 },
      { plate: 'JJJ-0000', model: 'Chevrolet Tahoe', year: 2022, status: 'available', capacity: 7 },
    ];

    const vehicles = [];
    for (const v of vehicleData) {
      const dbV = await prisma.vehicle.create({
        data: {
          plateNumber: v.plate,
          model: v.model,
          year: v.year,
          capacity: v.capacity || 4,
          qrCode: `QR-${v.plate}`,
          status: v.status,
        },
      });
      vehicles.push(dbV);
    }

    // 4. Expense Categories
    const categories = [
      { name: 'Fuel', requiresApproval: false },
      { name: 'Toll', requiresApproval: false },
      { name: 'Parking', requiresApproval: false },
      { name: 'Maintenance', requiresApproval: true },
      { name: 'Cleaning', requiresApproval: true },
      { name: 'Other', requiresApproval: true },
    ];
    for (const cat of categories) {
      await prisma.expenseCategory.create({ data: cat });
    }
    const dbCategories = await prisma.expenseCategory.findMany();

    // 5. Drivers with varied states
    console.log('  👤 Seeding drivers...');
    const driverPassword = await bcrypt.hash('Driver123!', 12);
    const drivers = [];
    for (let i = 1; i <= 8; i++) {
      const d = await prisma.user.create({
        data: {
          email: `driver${i}@fleet.com`,
          phone: `+96650000000${i+1}`,
          name: `Driver ${i}`,
          passwordHash: driverPassword,
          role: 'driver',
          licenseNumber: `LIC-999${i}`,
          identityVerified: i <= 5, // First 5 are verified
          isActive: i !== 8, // Last driver is inactive
        },
      });
      drivers.push(d);
    }

    // 6. Historical Data (Previous 14 days)
    console.log('  🕒 Generating historical data (14 days)...');
    const now = new Date();
    for (let d = 14; d >= 1; d--) {
      const date = new Date(now);
      date.setDate(now.getDate() - d);
      
      // Select 3 drivers to work this day
      for (let i = 0; i < 3; i++) {
        const driver = drivers[i];
        const vehicle = vehicles[i];
        
        const startTime = new Date(date);
        startTime.setHours(8, 0, 0, 0);
        const endTime = new Date(date);
        endTime.setHours(17, 0, 0, 0);

        const shift = await prisma.shift.create({
          data: {
            driverId: driver.id,
            vehicleId: vehicle.id,
            status: 'Closed',
            startedAt: startTime,
            closedAt: endTime,
            closeReason: 'End of shift',
            verificationStatus: 'VERIFIED',
          }
        });

        // Completed trip
        const tripStart = new Date(startTime);
        tripStart.setHours(9, 0, 0, 0);
        const tripEnd = new Date(startTime);
        tripEnd.setHours(10, 30, 0, 0);

        await prisma.trip.create({
          data: {
            driverId: driver.id,
            shiftId: shift.id,
            vehicleId: vehicle.id,
            status: 'COMPLETED',
            pickupLocation: 'Airport T1',
            dropoffLocation: 'Downtown Hotel',
            price: 150.00,
            actualStartTime: tripStart,
            actualEndTime: tripEnd,
            passengers: [{ name: 'John Doe', phone: '0501234567', bags: 1 }]
          }
        });

        // Add an expense
        await prisma.expense.create({
          data: {
            driverId: driver.id,
            shiftId: shift.id,
            categoryId: dbCategories[0].id, // Fuel
            amount: 75.50,
            description: 'Refill after airport run',
            status: 'approved',
            reviewedBy: admin.id,
            reviewedAt: new Date(tripEnd),
          }
        });
      }
    }

    // 7. Core Test Scenarios
    console.log('  🎯 Setting up specific test scenarios...');

    // Scenario A: Active Driver with In-Progress Trip
    const driverA = drivers[0];
    const vehicleA = vehicles[5];
    const shiftA = await prisma.shift.create({
      data: {
        driverId: driverA.id,
        vehicleId: vehicleA.id,
        status: 'Active',
        startedAt: new Date(Date.now() - 3600000), // 1 hour ago
        verificationStatus: 'VERIFIED',
      }
    });
    await prisma.trip.create({
      data: {
        driverId: driverA.id,
        shiftId: shiftA.id,
        vehicleId: vehicleA.id,
        status: 'IN_PROGRESS',
        pickupLocation: 'Corporate HQ',
        dropoffLocation: 'Business Bay',
        price: 200.00,
        actualStartTime: new Date(Date.now() - 1800000), // 30 mins ago
        passengers: [{ name: 'CEO', bags: 0 }]
      }
    });

    // Scenario B: Driver with Pending Identity Verification
    const driverB = drivers[6]; // driver7 (identityVerified: false)
    await prisma.identityVerification.create({
      data: {
        driverId: driverB.id,
        status: 'pending',
        photoUrl: 'seeding/selfie.jpg',
        idCardFront: 'seeding/front.jpg',
        idCardBack: 'seeding/back.jpg'
      }
    });

    // Scenario C: Reported Damage (Vehicle Locked)
    const driverC = drivers[1];
    const vehicleC = vehicles[3]; // DDD-4444 (status: damaged)
    const shiftC = await prisma.shift.create({
      data: {
        driverId: driverC.id,
        vehicleId: vehicleC.id,
        status: 'Closed',
        startedAt: new Date(Date.now() - 7200000),
        closedAt: new Date(Date.now() - 3600000),
        closeReason: 'Vehicle Damaged',
        verificationStatus: 'VERIFIED',
      }
    });
    const damage = await prisma.damageReport.create({
      data: {
        vehicleId: vehicleC.id,
        driverId: driverC.id,
        shiftId: shiftC.id,
        description: 'Rear bumper scratched during parking.',
        status: 'reported'
      }
    });
    await prisma.damagePhoto.create({
      data: {
        damageReportId: damage.id,
        photoUrl: 'seeding/damage1.jpg'
      }
    });

    // Scenario D: Pending Expense (Requires Approval)
    const driverD = drivers[2];
    const vehicleD = vehicles[6];
    const shiftD = await prisma.shift.create({
      data: {
        driverId: driverD.id,
        vehicleId: vehicleD.id,
        status: 'Active',
        startedAt: new Date(Date.now() - 7200000),
        verificationStatus: 'VERIFIED',
      }
    });
    await prisma.expense.create({
      data: {
        driverId: driverD.id,
        shiftId: shiftD.id,
        categoryId: dbCategories.find(c => c.name === 'Maintenance').id,
        amount: 350.00,
        description: 'Emergency tire patch',
        status: 'pending'
      }
    });

    // Scenario E: Cancelled Trip
    await prisma.trip.create({
      data: {
        driverId: driverD.id,
        shiftId: shiftD.id,
        vehicleId: vehicleD.id,
        status: 'CANCELLED',
        pickupLocation: 'Old Bridge',
        dropoffLocation: 'West Gate',
        price: 80.00,
        cancellationReason: 'No show',
        cancelledBy: admin.id
      }
    });

    // 8. Audit Logs
    console.log('  📝 Seeding audit logs...');
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actionType: 'vehicle.locked',
        entityType: 'vehicle',
        entityId: vehicles[2].id, // CCC-3333
        newState: { status: 'locked', reason: 'Safety review' },
        ipAddress: '127.0.0.1'
      }
    });

    console.log('\n🎉 Realistic Seeding Completed Successfully!');
    console.log('\n📋 Quick Test Logins:');
    console.log('  Admin:  hossam@sezar.com / Hossam@2026');
    console.log('  Driver: driver1@fleet.com / Driver123!');
    console.log('  (Active trip is on driver1 account)');

  } catch (error) {
    console.error('\n❌ Seeding Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
