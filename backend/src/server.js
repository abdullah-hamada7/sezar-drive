require('dotenv').config();
const { loadSecrets } = require('./config/secrets');

/**
 * Main application entry point
 */
async function startServer() {
  try {
    // 1. Load secrets from AWS if in production
    // This must happen BEFORE requiring app/config to ensure process.env is populated
    await loadSecrets();

    // 2. Run database migrations automatically
    const { execSync } = require('child_process');
    try {
      console.log('Running database migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: '/app' });
      console.log('✅ Migrations applied successfully');
    } catch (err) {
      console.error('❌ Migration failed:', err.message);
      // Don't exit — the database schema may already be up to date
    }

    // 3. Load dependencies after env is ready
    const http = require('http');
    const app = require('./app');
    const config = require('./config');
    const prisma = require('./config/database');
    const { initWebSocketServer } = require('./modules/tracking/tracking.ws');

    // 4. Explicitly connect to database with retries
    let connected = false;
    let retries = 5;
    while (!connected && retries > 0) {
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        connected = true;
      } catch (err) {
        retries -= 1;
        console.error(`❌ Database connection failed (${err.message}). Retries left: ${retries}`);
        if (retries === 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // 5. Auto-seed if no admin user exists (first deployment only)
    try {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount === 0) {
        console.log('No admin found — running seed...');
        execSync('npm run seed', { stdio: 'inherit', cwd: '/app' });
        console.log('✅ Seed completed successfully');
      } else {
        console.log('✅ Admin user exists — skipping seed');
      }
    } catch (err) {
      console.error('❌ Seed check/run failed:', err.message);
    }

    // 5b. Ensure expense categories exist (idempotent)
    try {
      const catCount = await prisma.expenseCategory.count();
      if (catCount === 0) {
        console.log('No expense categories found — seeding defaults...');
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
        console.log(`✅ ${defaultCategories.length} expense categories created`);
      }
    } catch (err) {
      console.error('❌ Expense category seed failed:', err.message);
    }

    // 3. Create Server
    const server = http.createServer(app);

    // 4. Initialize WebSocket
    initWebSocketServer(server);

    // 5. Start Listening
    server.listen(config.port, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║  Fleet Management API Server                     ║
║  Environment: ${config.nodeEnv.padEnd(35)}║
║  Port: ${String(config.port).padEnd(42)}║
║  API: http://localhost:${config.port}/api/v1${' '.repeat(17)}║
║  WebSocket: ws://localhost:${config.port}/ws/tracking${' '.repeat(8)}║
╚══════════════════════════════════════════════════╝
      `);
    });

    // Handle graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('FAILED TO START SERVER:', error);
    process.exit(1);
  }
}

/**
 * Setup process signal handlers for graceful shutdown
 */
function setupGracefulShutdown(server) {
  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Kick off the server
startServer();
