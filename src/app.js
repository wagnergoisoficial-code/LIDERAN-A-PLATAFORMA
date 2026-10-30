const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./shared/middlewares/error.middleware');
const config = require('./config/environment');
const fs = require('fs');
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

class App {
  constructor() {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddlewares() {
    // CORS configuration
    this.app.use(cors({
      origin: config.app.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parser middlewares 
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    const uploadDir = config.file.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    this.app.use('/uploads', express.static(uploadDir));

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

    // Request logging middleware (development only)
    if (config.isDevelopment()) {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date(),
      });
    });

    // API routes
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
