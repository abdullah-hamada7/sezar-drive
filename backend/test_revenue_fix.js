const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function completeTripToday() {
  const today = new Date();
  
  // Find a trip to complete
  const trip = await prisma.trip.findFirst({
    where: { status: 'IN_PROGRESS' }
  });

  if (!trip) {
    console.log('No IN_PROGRESS trip found. Finding any trip.');
    const anyTrip = await prisma.trip.findFirst();
    if (!anyTrip) {
      console.log('No trips found at all.');
      return;
    }
    
    await prisma.trip.update({
      where: { id: anyTrip.id },
      data: {
        status: 'COMPLETED',
        actualEndTime: today,
        price: 350.50
      }
    });
    console.log(`Updated trip ${anyTrip.id} to COMPLETED with price 350.50`);
  } else {
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        actualEndTime: today
      }
    });
    console.log(`Updated trip ${trip.id} to COMPLETED with price ${trip.price}`);
  }

  await prisma.$disconnect();
}

completeTripToday();
