import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

// Import middleware
import { errorHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

// Import routes
import authRoutes from '../routes/auth';
import userRoutes from '../routes/users';
import financialRoutes from '../routes/financial';
import hrRoutes from '../routes/hr';
import engineeringRoutes from '../routes/engineering';
import manufacturingRoutes from '../routes/manufacturing';
import controlRoutes from '../routes/control';

// Import services
import { DatabaseService } from '../services/database';
import { SocketService } from '../services/socket';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(limiter);
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
app.use('/api/docs', express.static(path.join(__dirname, '../../docs')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', authMiddleware, userRoutes);

// Module Routes (protected by authentication)
app.use('/api/v1/financial', authMiddleware, financialRoutes);
app.use('/api/v1/hr', authMiddleware, hrRoutes);
app.use('/api/v1/engineering', authMiddleware, engineeringRoutes);
app.use('/api/v1/manufacturing', authMiddleware, manufacturingRoutes);
app.use('/api/v1/control', authMiddleware, controlRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize database
    await DatabaseService.initialize();
    logger.info('Database connection established');

    // Initialize socket service
    SocketService.initialize(io);
    logger.info('Socket service initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 NitroERP Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    DatabaseService.close();
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
initializeServices(); 