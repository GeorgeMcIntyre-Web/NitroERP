import { Request, Response, NextFunction } from 'express';
import { logger, securityLogger } from '../utils/logger';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTHENTICATION_ERROR') {
    super(message, 401, code);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', code = 'AUTHORIZATION_ERROR') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND_ERROR') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT_ERROR') {
    super(message, 409, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', code = 'RATE_LIMIT_ERROR') {
    super(message, 429, code);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code = 'DATABASE_ERROR') {
    super(message, 500, code);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    requestId?: string;
  };
  stack?: string;
}

// Error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string;
  const timestamp = new Date().toISOString();
  const path = req.path;
  const method = req.method;

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_SERVER_ERROR';
  let isOperational = false;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    isOperational = true;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID_ERROR';
    isOperational = true;
  } else if (error.name === 'MongoError' || error.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database Error';
    code = 'DATABASE_ERROR';
    isOperational = true;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN_ERROR';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED_ERROR';
    isOperational = true;
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON format';
    code = 'INVALID_JSON_ERROR';
    isOperational = true;
  }

  // Log error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    path,
    method,
    requestId,
    userId: (req as any).user?.id,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp,
  };

  // Log based on error type and severity
  if (statusCode >= 500) {
    logger.error('Server Error', errorDetails);
  } else if (statusCode === 401 || statusCode === 403) {
    securityLogger.log('Security Error', errorDetails);
  } else {
    logger.warn('Client Error', errorDetails);
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code,
      statusCode,
      timestamp,
      path,
      method,
      requestId,
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Handle non-operational errors
  if (!isOperational) {
    logger.error('Non-operational error detected, shutting down gracefully');
    process.exit(1);
  }
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string,
    },
  });
};

// Request validation error handler
export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error && error.isJoi) {
    const validationError = new ValidationError(
      error.details.map((detail: any) => detail.message).join(', '),
      'VALIDATION_ERROR'
    );
    
    res.status(400).json({
      success: false,
      error: {
        message: validationError.message,
        code: validationError.code,
        statusCode: validationError.statusCode,
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method,
        requestId: req.headers['x-request-id'] as string,
        details: error.details,
      },
    });
  } else {
    next(error);
  }
};

// Rate limit error handler
export const rateLimitErrorHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new RateLimitError('Too many requests from this IP');
  
  res.status(429).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.headers['x-request-id'] as string,
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
    },
  });
}; 