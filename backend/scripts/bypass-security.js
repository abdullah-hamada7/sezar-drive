const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'test_driver_1771362563@fleet.com';
  
  console.log(`🚀 Bypassing security for ${email}...`);
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error('❌ User not found');
    process.exit(1);
  }

  // 1. Verify User Identity and Biometrics
  await prisma.user.update({
    where: { id: user.id },
    data: {
      identityVerified: true,
      lastBiometricVerifiedAt: new Date(),
      mustChangePassword: false
    }
  });
  console.log('✅ User identity and biometrics bypassed');

  // 2. Verify all devices
  const devices = await prisma.userDevice.updateMany({
    where: { userId: user.id },
    data: { isVerified: true }
  });
  console.log(`✅ Verified ${devices.count} device(s)`);

  // 3. Update any PendingVerification shifts
  const shifts = await prisma.shift.updateMany({
    where: { 
      driverId: user.id,
      status: 'PendingVerification'
    },
    data: {
      status: 'Active',
      verificationStatus: 'VERIFIED',
      startedAt: new Date()
    }
  });
  console.log(`✅ Activated ${shifts.count} pending shift(s)`);

  // 4. Close any old Active shifts if they don't have vehicle assignments (optional, but keeps it clean)
  
  console.log('✨ All security hurdles bypassed for test driver.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
