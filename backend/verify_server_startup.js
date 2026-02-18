require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('Attempting to initialize PrismaClient like database.js...');
try {
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });
  console.log('Prisma initialized. Attempting connect...');
  prisma.$connect()
    .then(() => {
      console.log('Prisma connected successfully via $connect()!');
      return prisma.user.findFirst();
    })
    .then((user) => {
      console.log('Query successful! Found user:', user ? user.email : 'None');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Prisma connection/query failed:', err);
      process.exit(1);
    });
} catch (err) {
  console.error('Prisma initialization threw error:', err);
  process.exit(1);
}
