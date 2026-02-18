require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting extensive database seeding...');

  try {
    // 1. Clean existing data (respecting foreign keys)
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
    await prisma.adminConfig.deleteMany();
    await prisma.user.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.expenseCategory.deleteMany();

    // 2. Admin User
    const adminPassword = await bcrypt.hash('Hossam@2026', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'hossam@sezar.com' },
      update: {},
      create: {
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

    // 3. Vehicles
    const vehicleModels = ['Toyota Camry', 'Toyota Hiace', 'Hyundai Sonata', 'Ford Transit', 'Tesla Model 3'];
    const vehicles = [];
    for (let i = 1; i <= 10; i++) {
      const v = await prisma.vehicle.upsert({
        where: { plateNumber: `PLT-${1000 + i}` },
        update: {},
        create: {
          plateNumber: `PLT-${1000 + i}`,
          model: vehicleModels[i % vehicleModels.length],
          year: 2020 + (i % 5),
          capacity: i % 2 === 0 ? 4 : 12,
          qrCode: `VH-QR-${String(i).padStart(3, '0')}`,
          status: 'available',
        },
      });
      vehicles.push(v);
    }
    console.log(`  ✅ Seeded ${vehicles.length} vehicles.`);

    // 4. Expense Categories
    const categories = [
      { name: 'Fuel', requiresApproval: false },
      { name: 'Toll', requiresApproval: false },
      { name: 'Parking', requiresApproval: false },
      { name: 'Maintenance', requiresApproval: true },
      { name: 'Cleaning', requiresApproval: true },
      { name: 'Snack', requiresApproval: false },
    ];
    for (const cat of categories) {
      await prisma.expenseCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      });
    }
    const dbCategories = await prisma.expenseCategory.findMany();
    console.log(`  ✅ Seeded ${dbCategories.length} expense categories.`);

    // 5. Drivers
    const driverPassword = await bcrypt.hash('Driver123!', 12);
    const drivers = [];
    for (let i = 1; i <= 10; i++) {
      const d = await prisma.user.upsert({
        where: { email: `driver${i}@fleet.com` },
        update: {},
        create: {
          email: `driver${i}@fleet.com`,
          phone: `+20100000000${i}`,
          name: `Driver ${i}`,
          passwordHash: driverPassword,
          role: 'driver',
          licenseNumber: `LIC-${2000 + i}`,
          identityVerified: i <= 7, // 7 verified, 3 pending
          isActive: true,
        },
      });
      drivers.push(d);
    }
    console.log(`  ✅ Seeded ${drivers.length} drivers (7 verified, 3 pending).`);

    // 6. Historical Data (Last 30 Days)
    console.log('  🕒 Generating historical data...');
    const now = new Date();
    for (let day = 1; day <= 30; day++) {
      const date = new Date(now);
      date.setDate(now.getDate() - day);

      // Each day, 3-5 drivers work
      const activeDriversThisDay = drivers.slice(0, 5);
      for (const driver of activeDriversThisDay) {
        // Create a closed shift
        const shiftStart = new Date(date);
        shiftStart.setHours(8, 0, 0, 0);
        const shiftEnd = new Date(date);
        shiftEnd.setHours(17, 0, 0, 0);

        const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];

        const shift = await prisma.shift.create({
          data: {
            driverId: driver.id,
            vehicleId: vehicle.id,
            status: 'Closed',
            startedAt: shiftStart,
            closedAt: shiftEnd,
            closeReason: 'End of Day',
            verificationStatus: 'VERIFIED',
          },
        });

        // Add 2-3 completed trips for this shift
        for (let t = 1; t <= 3; t++) {
          const tripStart = new Date(shiftStart);
          tripStart.setHours(8 + (t * 2));
          const tripEnd = new Date(tripStart);
          tripEnd.setHours(tripStart.getHours() + 1);

          await prisma.trip.create({
            data: {
              driverId: driver.id,
              shiftId: shift.id,
              vehicleId: vehicle.id,
              status: 'COMPLETED',
              pickupLocation: `Location A${day}${t}`,
              dropoffLocation: `Location B${day}${t}`,
              price: 150 + (t * 50),
              actualStartTime: tripStart,
              actualEndTime: tripEnd,
              passengers: [
                { name: `Passenger ${day}-${t}-1`, phone: '0123456789', pickup: 'Default', bags: 1 },
                { name: `Passenger ${day}-${t}-2`, phone: '0987654321', pickup: 'Side street', bags: 0 },
              ],
            },
          });
        }

        // Add an expense
        await prisma.expense.create({
          data: {
            driverId: driver.id,
            shiftId: shift.id,
            categoryId: dbCategories[Math.floor(Math.random() * dbCategories.length)].id,
            amount: 50 + (Math.random() * 100),
            description: `Fuel for day ${day}`,
            status: 'approved',
            reviewedBy: admin.id,
          },
        });
      }
    }
    console.log('  ✅ Historical data seeded.');

    // 7. Active Data
    console.log('  ⚡ Generating active data...');
    
    // Active Shift 1: In Progress Trip
    const driverActive1 = drivers[5]; // Verified driver
    const vehicleActive1 = vehicles[0];
    const shiftActive1 = await prisma.shift.create({
      data: {
        driverId: driverActive1.id,
        vehicleId: vehicleActive1.id,
        status: 'Active',
        startedAt: new Date(),
        verificationStatus: 'VERIFIED',
      },
    });

    await prisma.trip.create({
      data: {
        driverId: driverActive1.id,
        shiftId: shiftActive1.id,
        vehicleId: vehicleActive1.id,
        status: 'IN_PROGRESS',
        pickupLocation: 'Downtown Cairo',
        dropoffLocation: 'Maadi',
        price: 250.00,
        actualStartTime: new Date(),
        passengers: [{ name: 'VIP Guest', phone: '01011112222', bags: 2 }],
      },
    });

    // Active Shift 2: Pending Trip
    const driverActive2 = drivers[6];
    const vehicleActive2 = vehicles[1];
    const shiftActive2 = await prisma.shift.create({
      data: {
        driverId: driverActive2.id,
        vehicleId: vehicleActive2.id,
        status: 'Active',
        startedAt: new Date(),
        verificationStatus: 'VERIFIED',
      },
    });

    await prisma.trip.create({
      data: {
        driverId: driverActive2.id,
        shiftId: shiftActive2.id,
        vehicleId: vehicleActive2.id,
        status: 'ACCEPTED',
        pickupLocation: 'Airport T3',
        dropoffLocation: 'Zamalek',
        price: 400.00,
        scheduledTime: new Date(Date.now() + 3600000), // In 1 hour
      },
    });

    console.log('  ✅ Active data seeded.');

    console.log('\n🎉 Extensive Seeding Completed Successfully!');
    console.log('\n📋 Quick Test Logins:');
    console.log('  Admin:  hossam@sezar.com / Hossam@2026');
    console.log('  Driver (active): driver5@fleet.com / Driver123!');

  } catch (error) {
    console.error('\n❌ Seeding Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
