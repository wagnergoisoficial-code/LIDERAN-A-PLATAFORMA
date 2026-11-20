const http = require('http');
const bcrypt = require('bcrypt');
const App = require('./app');
const config = require('./config/environment');
const { getPrismaClient, disconnectPrisma } = require('./config/database');

// Endereços da API. No projeto único (server.mjs), o resto são páginas e vai para o Next.js.
const API_PATH = /^\/(api(-docs(\.json)?)?|uploads|health)(\/|\?|$)/i;

class Server {
  constructor() {
    this.app = null;
    this.httpServer = null;
  }

  // pages: quem responde às páginas (o Next.js); sem ele, o servidor é só a API, como antes.
  // onShutdown: o que fechar antes de desligar (o Next.js)
  async start({ pages, onShutdown } = {}) {
    this.onShutdown = onShutdown;
    try {
      // Produção mal configurada não chega a aceitar pedidos
      const warnings = config.validateForProduction();
      warnings.forEach((warning) => console.warn(`⚠️  ${warning}`));

      await this.ensureAdmin();

      this.app = new App();
      const api = this.app.getApp();
      const handler = pages ? (req, res) => (API_PATH.test(req.url) ? api(req, res) : pages(req, res)) : api;
      this.httpServer = http.createServer(handler).listen(config.app.port, () => {
        console.log(
          `✅ Server running on port ${config.app.port} (${config.app.nodeEnv})`
        );
      });

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  // Cria o primeiro administrador a partir de ADMIN_EMAIL / ADMIN_PASSWORD (só se ainda não existir)
  async ensureAdmin() {
    const { email, password, name } = config.admin;
    if (!email || !password) return;

    const prisma = getPrismaClient();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return;

    await prisma.user.create({
      data: { email, name, role: 'admin', password: await bcrypt.hash(password, 12) },
    });
    console.log(`✅ Administrador criado: ${email}`);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📍 ${signal} received, shutting down gracefully...`);

      if (this.onShutdown) await this.onShutdown().catch(() => {});
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
