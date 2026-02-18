const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log('Connection successful! User count:', userCount);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
