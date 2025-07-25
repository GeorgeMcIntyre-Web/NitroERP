import { Request, Response, NextFunction } from 'express';
import { logger, performanceLogger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);

  // Log request start
  logger.info('API Request Started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    // Log request completion
    logger.info('API Request Completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
    });

    // Log performance metrics for slow requests
    if (duration > 1000) {
      performanceLogger.start(`Slow Request: ${req.method} ${req.originalUrl}`).end({
        requestId,
        duration,
        statusCode: res.statusCode,
        userId: (req as any).user?.id,
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 