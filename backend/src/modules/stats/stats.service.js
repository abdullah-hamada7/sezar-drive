const prisma = require('../../config/database');

/**
 * Get revenue trends (daily revenue for the last 7 days).
 */
async function getRevenueStats() {
  // In a real production app with massive data, we'd use raw SQL for aggregation or a dedicated analytics DB.
  // For this scale, Prisma groupBy or raw query is fine.
  
  // For "Current Day Only":
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Group by hour for today's chart? Or just return total?
  // The frontend expects [{ name: 'Mon', value: 1000 }] format for a bar chart.
  // If we want "Daily Revenue" chart for *today*, maybe we show hourly breakdown?
  // Or if the requirement is just "the current day only", the existing chart might look weird if it expects 7 days.
  // BUT the PRD says: "Daily Revenue (Line chart) - Current Day View." => Implies hourly breakdown for today.
  
  // Let's query hourly revenue for today.
  const rawRevenue = await prisma.$queryRaw`
    SELECT 
      EXTRACT(HOUR FROM actual_end_time) as hour, 
      SUM(price) as total 
    FROM trips 
    WHERE status = 'COMPLETED' 
      AND actual_end_time >= ${today}
      AND actual_end_time < ${tomorrow}
    GROUP BY EXTRACT(HOUR FROM actual_end_time)
    ORDER BY hour ASC
  `;

  const result = [];
  // 00:00 to 23:00
  for (let i = 0; i < 24; i++) {
    const match = rawRevenue.find(r => Number(r.hour) === i);
    result.push({
      name: `${i}:00`,
      value: match ? Number(match.total) : 0
    });
  }

  return result;
}

/**
 * Get driver activity stats (Active vs Offline).
 * Uses a more efficient distinct count query.
 */
async function getActivityStats() {
  const totalDrivers = await prisma.user.count({ where: { role: 'driver', isActive: true } });
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Use groupBy/count to avoid fetching records
  const activeCountResult = await prisma.shift.groupBy({
    by: ['driverId'],
    where: {
      OR: [
        { createdAt: { gte: today, lt: tomorrow } },
        { closedAt: { gte: today, lt: tomorrow } },
        { 
          createdAt: { lt: today },
          closedAt: null
        },
        {
           createdAt: { lt: today },
           closedAt: { gt: today }
        }
      ]
    },
  });

  const activeCount = activeCountResult.length;

  return [
    { name: 'Active Today', value: activeCount },
    { name: 'Offline', value: Math.max(0, totalDrivers - activeCount) }
  ];
}

/**
 * Get weekly revenue for a specific driver.
 */
async function getDriverWeeklyStats(driverId) {
  const today = new Date();
  // Get Monday of current week
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const rawRevenue = await prisma.$queryRaw`
    SELECT 
      EXTRACT(ISODOW FROM actual_end_time) as day_num, 
      SUM(price) as total 
    FROM trips 
    WHERE status = 'COMPLETED' 
      AND driver_id = ${driverId}
      AND actual_end_time >= ${monday}
    GROUP BY EXTRACT(ISODOW FROM actual_end_time), date_trunc('day', actual_end_time)
    ORDER BY date_trunc('day', actual_end_time) ASC
  `;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const result = days.map((d, index) => {
    // ISODOW: 1=Monday, 7=Sunday. index+1 matches this.
    const match = rawRevenue.find(r => Number(r.day_num) === index + 1);
    return {
      day: d,
      amount: match ? Number(match.total) : 0
    };
  });


  return result;
}

async function getSummaryStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalDrivers, 
    totalVehicles, 
    totalTrips, 
    activeShifts, 
    pendingExpenses,
    pendingVerifications,
    pendingDamagesTotal,
    todayTrips,
    todayExpenses,
    todayPendingExpenses,
    todayDamages
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'driver', isActive: true } }),
    prisma.vehicle.count({ where: { isActive: true } }),
    prisma.trip.count(),
    prisma.shift.count({ where: { status: 'Active' } }),
    prisma.expense.count({ where: { status: 'pending' } }),
    prisma.identityVerification.count({ where: { status: 'pending' } }),
    prisma.damageReport.count({ where: { status: 'reported' } }),
    // Daily Stats
    prisma.trip.findMany({
      where: {
        status: 'COMPLETED',
        actualEndTime: { gte: today, lt: tomorrow }
      },
      select: { price: true }
    }),
    // Today's total expenses (approved + pending)
    prisma.expense.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow }
      },
      select: { amount: true }
    }),
    // Today's pending expenses count
    prisma.expense.count({
      where: {
        status: 'pending',
        createdAt: { gte: today, lt: tomorrow }
      }
    }),
    prisma.damageReport.count({
      where: { createdAt: { gte: today, lt: tomorrow } }
    })
  ]);

  const todayRevenue = todayTrips.reduce((sum, t) => sum + Number(t.price), 0);
  const todayExpensesTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    totalDrivers,
    totalVehicles,
    totalTrips,
    activeShifts,
    totalPendingExpenses: pendingExpenses, // Retain total pending for clarity if needed, but summary uses today
    todayPendingExpenses,
    pendingExpenses: todayPendingExpenses, // Keep original key but with filtered value for dashboard compatibility
    pendingVerifications,
    pendingDamages: pendingDamagesTotal,
    todayRevenue,
    todayExpenses: todayExpensesTotal,
    todayDamages
  };
}

module.exports = {
  getRevenueStats,
  getActivityStats,
  getDriverWeeklyStats,
  getSummaryStats
};


