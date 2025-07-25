import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from '../config/environment';
import { validateEnvironment } from '../config/environment';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestLogger } from './middleware/requestLogger';
import { authMiddleware } from './middleware/authMiddleware';

// Import route modules
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import financialRoutes from './routes/financialRoutes';
import hrRoutes from './routes/hrRoutes';
import engineeringRoutes from './routes/engineeringRoutes';
import manufacturingRoutes from './routes/manufacturingRoutes';
import controlRoutes from './routes/controlRoutes';
import workflowRoutes from './routes/workflowRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Import service initializers
import { initializeDatabase } from './database/connection';
import { initializeRedis } from './services/redisService';
import { initializeSocketIO } from './services/socketService';
import { initializeWorkflowEngine } from './services/workflowEngine';
import { initializeNotificationService } from './services/notificationService';
import { initializeExchangeRateService } from './services/exchangeRateService';

class NitroERPApp {
  private app: express.Application;
  private server: any;
  private io: Server;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });
  }

  private async initializeServices(): Promise<void> {
    try {
      logger.info('Initializing NitroERP services...');

      // Validate environment configuration
      validateEnvironment();

      // Initialize database connection
      await initializeDatabase();
      logger.info('Database connection established');

      // Initialize Redis
      await initializeRedis();
      logger.info('Redis connection established');

      // Initialize workflow engine
      await initializeWorkflowEngine();
      logger.info('Workflow engine initialized');

      // Initialize notification service
      await initializeNotificationService();
      logger.info('Notification service initialized');

      // Initialize exchange rate service
      await initializeExchangeRateService();
      logger.info('Exchange rate service initialized');

      // Initialize Socket.IO
      initializeSocketIO(this.io);
      logger.info('Socket.IO initialized');

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.NODE_ENV,
      });
    });
  }

  private setupRoutes(): void {
    // API version prefix
    const apiPrefix = `/api/${config.API_VERSION}`;

    // Public routes (no authentication required)
    this.app.use(`${apiPrefix}/auth`, authRoutes);

    // Protected routes (authentication required)
    this.app.use(`${apiPrefix}/users`, authMiddleware, userRoutes);
    this.app.use(`${apiPrefix}/financial`, authMiddleware, financialRoutes);
    this.app.use(`${apiPrefix}/hr`, authMiddleware, hrRoutes);
    this.app.use(`${apiPrefix}/engineering`, authMiddleware, engineeringRoutes);
    this.app.use(`${apiPrefix}/manufacturing`, authMiddleware, manufacturingRoutes);
    this.app.use(`${apiPrefix}/control`, authMiddleware, controlRoutes);
    this.app.use(`${apiPrefix}/workflow`, authMiddleware, workflowRoutes);
    this.app.use(`${apiPrefix}/notifications`, authMiddleware, notificationRoutes);

    // API documentation endpoint
    this.app.get(`${apiPrefix}/docs`, (req, res) => {
      res.json({
        message: 'NitroERP API Documentation',
        version: config.API_VERSION,
        endpoints: {
          auth: `${apiPrefix}/auth`,
          users: `${apiPrefix}/users`,
          financial: `${apiPrefix}/financial`,
          hr: `${apiPrefix}/hr`,
          engineering: `${apiPrefix}/engineering`,
          manufacturing: `${apiPrefix}/manufacturing`,
          control: `${apiPrefix}/control`,
          workflow: `${apiPrefix}/workflow`,
          notifications: `${apiPrefix}/notifications`,
        },
        documentation: '/docs',
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close server
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close database connections
      try {
        // Add database cleanup here when implemented
        logger.info('Database connections closed');
      } catch (error) {
        logger.error('Error closing database connections:', error);
      }

      // Close Redis connections
      try {
        // Add Redis cleanup here when implemented
        logger.info('Redis connections closed');
      } catch (error) {
        logger.error('Error closing Redis connections:', error);
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  public async start(): Promise<void> {
    try {
      // Initialize all services
      await this.initializeServices();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      // Start server
      this.server.listen(config.PORT, () => {
        logger.info(`🚀 NitroERP server started successfully`);
        logger.info(`📍 Environment: ${config.NODE_ENV}`);
        logger.info(`🌐 Server running on port: ${config.PORT}`);
        logger.info(`📚 API Documentation: http://localhost:${config.PORT}/api/${config.API_VERSION}/docs`);
        logger.info(`❤️  Health Check: http://localhost:${config.PORT}/health`);
        logger.info(`🔌 WebSocket ready for real-time updates`);
      });
    } catch (error) {
      logger.error('Failed to start NitroERP server:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new NitroERPApp();
app.start().catch((error) => {
  logger.error('Application startup failed:', error);
  process.exit(1);
});

export default app; 