import { Request, Response, NextFunction } from 'express';
import { logger, logError } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed', code?: string) {
    super(message, 401, code);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Access denied', code?: string) {
    super(message, 403, code);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests', code?: string) {
    super(message, 429, code);
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log the error
  logError(error, req.path, req.user?.id);

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    if ((error as any).code === 11000) {
      statusCode = 409;
      message = 'Duplicate field value';
    }
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    message = 'File upload error';
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    code: error.code,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message,
    }),
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Validation error handler
export const handleValidationError = (error: any): CustomError => {
  const errors = Object.values(error.errors).map((err: any) => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new ValidationError(message);
};

// Database error handler
export const handleDatabaseError = (error: any): CustomError => {
  if (error.code === '23505') { // Unique constraint violation
    return new ConflictError('Duplicate entry found');
  } else if (error.code === '23503') { // Foreign key constraint violation
    return new ValidationError('Referenced record does not exist');
  } else if (error.code === '23502') { // Not null constraint violation
    return new ValidationError('Required field is missing');
  } else if (error.code === '22P02') { // Invalid text representation
    return new ValidationError('Invalid data format');
  }
  
  return new CustomError('Database operation failed', 500);
};

// File upload error handler
export const handleFileUploadError = (error: any): CustomError => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File size too large');
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    return new ValidationError('Too many files uploaded');
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field');
  }
  
  return new CustomError('File upload failed', 500);
};

// Rate limiting error handler
export const handleRateLimitError = (error: any): CustomError => {
  return new RateLimitError('Too many requests from this IP');
};

// Global error handler for unhandled rejections
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
};

// Global error handler for uncaught exceptions
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
};

// Request timeout handler
export const timeoutHandler = (timeout: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      const error = new CustomError('Request timeout', 408);
      next(error);
    }, timeout);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};

// Response time logging middleware
export const responseTimeLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}; 