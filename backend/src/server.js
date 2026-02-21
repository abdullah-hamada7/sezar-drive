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

    // 2. Load dependencies after env is ready
    const http = require('http');
    const app = require('./app');
    const config = require('./config');
    const prisma = require('./config/database');
    const { initWebSocketServer } = require('./modules/tracking/tracking.ws');

    // 2.1 Explicitly connect to database with retries
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
