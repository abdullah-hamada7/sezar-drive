require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (Admin Only)...');

  try {
    // 1. Clean existing data (respecting foreign keys)
    console.log('  🗑️ Cleaning existing data...');

    // Deleting in reverse order of dependencies
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
    await prisma.rescueRequest.deleteMany();
    await prisma.adminConfig.deleteMany();
    await prisma.user.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.expenseCategory.deleteMany();

    console.log('  ✅ Database cleaned.');

    // 2. Create admin user
    const adminPassword = await bcrypt.hash('Hossam@2026', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'hossam@sezar.com',
        phone: '1234567890',
        name: 'System Admin',
        passwordHash: adminPassword,
        role: 'admin',
        mustChangePassword: false,
        identityVerified: true,
        isActive: true,
      },
    });
    console.log(`  ✅ Admin created: ${admin.email}`);

    // 3. Create default expense categories
    const defaultCategories = [
      { name: 'Fuel', requiresApproval: false },
      { name: 'Tolls', requiresApproval: false },
      { name: 'Maintenance', requiresApproval: true },
      { name: 'Car Wash', requiresApproval: false },
      { name: 'Parking', requiresApproval: false },
      { name: 'Meals', requiresApproval: true },
      { name: 'Other', requiresApproval: true },
    ];

    for (const cat of defaultCategories) {
      await prisma.expenseCategory.create({ data: cat });
    }
    console.log(`  ✅ ${defaultCategories.length} expense categories created.`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log('  Admin:  hossam@sezar.com / Hossam@2026');

  } catch (error) {
    console.error('\n❌ Seeding Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
