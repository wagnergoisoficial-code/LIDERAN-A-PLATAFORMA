const App = require('./app');
const config = require('./config/environment');
const { disconnectPrisma } = require('./config/database');

class Server {
  constructor() {
    this.app = new App();
    this.httpServer = null;
  }

  async start() {
    try {
      this.httpServer = this.app.getApp().listen(config.app.port, () => {
        console.log(
          `✅ Server running on port ${config.app.port} (${config.app.nodeEnv})`
        );
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📍 ${signal} received, shutting down gracefully...`);

      if (this.httpServer) {
        this.httpServer.close(async () => {
          console.log('✅ HTTP server closed');
          await disconnectPrisma();
          console.log('✅ Database disconnected');
          process.exit(0);
        });
      }

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections, forcing shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
}

// Start server
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;
