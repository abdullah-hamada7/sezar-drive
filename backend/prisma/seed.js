const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({ 
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@2024', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fleet.com' },
    update: {},
    create: {
      email: 'admin@fleet.com',
      phone: '+966500000001',
      name: 'System Admin',
      passwordHash: adminPassword,
      role: 'admin',
      mustChangePassword: false,
      identityVerified: true,
      isActive: true,
    },
  });
  console.log(`  ✅ Admin: ${admin.email}`);

  // Create demo driver
  const driverPassword = await bcrypt.hash('Driver123!', 12);
  const driver = await prisma.user.upsert({
    where: { email: 'driver1@fleet.com' },
    update: {
      passwordHash: driverPassword,
    },
    create: {
      email: 'driver1@fleet.com',
      phone: '+966500000002',
      name: 'Sezar Drive',
      passwordHash: driverPassword,
      role: 'driver',
      licenseNumber: 'DL-2024-001',
      mustChangePassword: true,
      identityVerified: false,
      isActive: true,
    },
  });
  console.log(`  ✅ Driver: ${driver.email}`);

  // Create vehicles
  const vehicles = [
    { plateNumber: 'ABC-1234', model: 'Toyota Camry', year: 2023, capacity: 4, qrCode: 'VH-QR-001' },
    { plateNumber: 'DEF-5678', model: 'Toyota Hiace', year: 2022, capacity: 12, qrCode: 'VH-QR-002' },
    { plateNumber: 'GHI-9012', model: 'Hyundai Sonata', year: 2024, capacity: 4, qrCode: 'VH-QR-003' },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { plateNumber: v.plateNumber },
      update: {},
      create: v,
    });
    console.log(`  ✅ Vehicle: ${v.plateNumber} (${v.model})`);
  }

  // Create expense categories
  const categories = [
    { name: 'Fuel', requiresApproval: false },
    { name: 'Toll', requiresApproval: false },
    { name: 'Parking', requiresApproval: false },
    { name: 'Maintenance', requiresApproval: true },
    { name: 'Cleaning', requiresApproval: true },
    { name: 'Other', requiresApproval: true },
  ];

  for (const c of categories) {
    await prisma.expenseCategory.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    console.log(`  ✅ Category: ${c.name}`);
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:  admin@fleet.com / Admin@2024');
  console.log('  Driver: driver1@fleet.com / Driver123! (must change password on first login)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
