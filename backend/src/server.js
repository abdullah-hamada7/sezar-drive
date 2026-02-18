require('dotenv').config();
const http = require('http');
const app = require('./app');
const config = require('./config');
const { initWebSocketServer } = require('./modules/tracking/tracking.ws');

const server = http.createServer(app);

// Initialize WebSocket for real-time tracking
initWebSocketServer(server);

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

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
