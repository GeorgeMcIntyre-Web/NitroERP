import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nitroerp' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, log to console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create a stream object for Morgan HTTP logging
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Export logger instance
export { logger };

// Helper functions for specific logging scenarios
export const logUserAction = (userId: string, action: string, details?: any) => {
  logger.info('User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logSystemEvent = (event: string, details?: any) => {
  logger.info('System Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurityEvent = (event: string, userId?: string, details?: any) => {
  logger.warn('Security Event', {
    event,
    userId,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logDatabaseQuery = (query: string, duration: number, params?: any) => {
  logger.debug('Database Query', {
    query,
    duration: `${duration}ms`,
    params,
    timestamp: new Date().toISOString(),
  });
};

export const logApiRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  logger.info('API Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const logError = (error: Error, context?: string, userId?: string) => {
  logger.error('Application Error', {
    error: error.message,
    stack: error.stack,
    context,
    userId,
    timestamp: new Date().toISOString(),
  });
}; 