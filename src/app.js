const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorMiddleware = require('./shared/middlewares/error.middleware');
const { apiLimiter } = require('./shared/middlewares/rate-limit.middleware');
const config = require('./config/environment');
const { getPrismaClient } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const postRoutes = require('./routes/post.routes');
const postReactionRoute = require('./routes/post.reaction');
const devotionalRoutes = require('./routes/devotional.routes');
const churchRoutes = require('./routes/church.routes');
const chatRoutes = require('./routes/chat.routes');
const eventRoutes = require('./routes/event.routes');
const prayerRoutes = require('./routes/prayer.routes');
const pollRoutes = require('./routes/poll.routes');
const notificationRoutes = require('./routes/notification.routes');
const sermonRoutes = require('./routes/sermon.routes');
const groupRoutes = require('./routes/group.routes');
const searchRoutes = require('./routes/search.routes');
const uploadRoutes = require('./routes/upload.routes');

class App {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    // Atrás do proxy da plataforma: IP real do cliente e protocolo https
    if (config.app.trustProxy) this.app.set('trust proxy', config.app.trustProxy);

    // Cabeçalhos de segurança. A API só devolve JSON e imagens.
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: config.swagger.enabled
          ? false
          : { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      })
    );

    // CORS: em produção só os sites listados em CORS_ORIGIN usam a API pelo navegador
    const allowAnyOrigin = !config.isProduction() && !config.app.corsOrigins.length;
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowAnyOrigin) return callback(null, true);
          callback(null, config.app.corsOrigins.includes(origin));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 600,
      })
    );

    // Corpos de pedido com tamanho limitado (uploads têm limite próprio)
    this.app.use(express.json({ limit: '100kb' }));
    this.app.use(express.urlencoded({ extended: false, limit: '100kb' }));

    // Registo de pedidos: simples em desenvolvimento, com estado e duração em produção
    if (config.isDevelopment()) {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    } else if (config.isProduction()) {
      this.app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms`);
        });
        next();
      });
    }

    // Swagger documentation
    if (config.swagger.enabled) {
      this.app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
          swaggerOptions: {
            url: '/api-docs.json',
          },
        })
      );

      this.app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
    }
  }

  setupRoutes() {
    // Health check (usado pela plataforma para saber se a API e a base de dados respondem)
    this.app.get('/health', async (req, res) => {
      try {
        await getPrismaClient().$queryRaw`SELECT 1`;
        res.status(200).json({ success: true, message: 'Server is running', database: 'ok', timestamp: new Date() });
      } catch {
        res.status(503).json({ success: false, message: 'Database unavailable', timestamp: new Date() });
      }
    });

    // Imagens (fora do limite da API: o navegador pede várias de uma vez e ficam em cache)
    this.app.use('/uploads', uploadRoutes);

    // API routes
    this.app.use('/api', apiLimiter);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/posts', postRoutes);
    this.app.use('/api/posts', postReactionRoute);
    this.app.use('/api/devotionals', devotionalRoutes);
    this.app.use('/api/churches', churchRoutes);
    this.app.use('/api/chat', chatRoutes);
    this.app.use('/api/events', eventRoutes);
    this.app.use('/api/prayers', prayerRoutes);
    this.app.use('/api/polls', pollRoutes);
    this.app.use('/api/notifications', notificationRoutes);
    this.app.use('/api/sermons', sermonRoutes);
    this.app.use('/api/groups', groupRoutes);
    this.app.use('/api/search', searchRoutes);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorMiddleware);
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;
