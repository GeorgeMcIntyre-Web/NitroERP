import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '../../config/environment';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for all environments
transports.push(
  new winston.transports.Console({
    format: config.NODE_ENV === 'development' ? consoleFormat : logFormat,
    level: config.LOG_LEVEL,
  })
);

// File transport for production and staging
if (config.NODE_ENV !== 'development') {
  // Daily rotate file transport
  transports.push(
    new DailyRotateFile({
      filename: config.LOG_FILE.replace('.log', '-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: config.LOG_LEVEL,
      format: logFormat,
    })
  );

  // Error log file
  transports.push(
    new DailyRotateFile({
      filename: config.LOG_FILE.replace('.log', '-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Custom logger methods for different contexts
export const createLogger = (context: string) => ({
  info: (message: string, meta?: any) => logger.info(message, { context, ...meta }),
  error: (message: string, meta?: any) => logger.error(message, { context, ...meta }),
  warn: (message: string, meta?: any) => logger.warn(message, { context, ...meta }),
  debug: (message: string, meta?: any) => logger.debug(message, { context, ...meta }),
  verbose: (message: string, meta?: any) => logger.verbose(message, { context, ...meta }),
});

// Performance logging utility
export const performanceLogger = {
  start: (operation: string) => {
    const startTime = Date.now();
    return {
      end: (meta?: any) => {
        const duration = Date.now() - startTime;
        logger.info(`${operation} completed in ${duration}ms`, { 
          operation, 
          duration, 
          ...meta 
        });
        return duration;
      },
    };
  },
};

// Audit logging utility
export const auditLogger = {
  log: (action: string, userId: string, resource: string, details?: any) => {
    logger.info('Audit log', {
      action,
      userId,
      resource,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};

// Security logging utility
export const securityLogger = {
  log: (event: string, details: any) => {
    logger.warn('Security event', {
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },
};

// Database logging utility
export const dbLogger = createLogger('Database');

// API logging utility
export const apiLogger = createLogger('API');

// Workflow logging utility
export const workflowLogger = createLogger('Workflow');

// Notification logging utility
export const notificationLogger = createLogger('Notification');

// Exchange rate logging utility
export const exchangeRateLogger = createLogger('ExchangeRate');

export { logger }; 