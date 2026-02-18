const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTodayTrips() {
  const today = new Date('2026-02-17');
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  console.log(`Checking trips between ${today.toISOString()} and ${tomorrow.toISOString()}`);

  const trips = await prisma.trip.findMany({
    where: {
      actualEndTime: { gte: today, lt: tomorrow }
    }
  });

  console.log(`Found ${trips.length} trips with actualEndTime today.`);
  trips.forEach(t => {
    console.log(`- Trip ID: ${t.id}, Status: ${t.status}, Price: ${t.price}, EndTime: ${t.actualEndTime}`);
  });

  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  console.log(`Found ${completedTrips.length} COMPLETED trips today.`);
  
  const totalRevenue = completedTrips.reduce((sum, t) => sum + Number(t.price), 0);
  console.log(`Total Revenue: ${totalRevenue}`);

  // Also check all trips to see if there are any at all
  const allTripsCount = await prisma.trip.count();
  console.log(`Total trips in database: ${allTripsCount}`);

  await prisma.$disconnect();
}

checkTodayTrips();
