import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types';
import { logger, logSecurityEvent } from '../utils/logger';
import { databaseService } from '../services/database';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  department: string;
  iat: number;
  exp: number;
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('Missing or invalid authorization header', undefined, { ip: req.ip });
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    // Get user from database to ensure they still exist and are active
    const db = databaseService.getConnection();
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      logSecurityEvent('User not found or inactive', decoded.userId, { ip: req.ip });
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
      return;
    }

    // Update last login
    await db('users')
      .where({ id: decoded.userId })
      .update({ last_login: new Date() });

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logSecurityEvent('Invalid JWT token', undefined, { ip: req.ip, error: error.message });
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      logSecurityEvent('Expired JWT token', undefined, { ip: req.ip });
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    } else {
      logger.error('Authentication error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication failed',
      });
    }
  }
};

// Role-based access control middleware
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logSecurityEvent('Insufficient permissions', req.user.id, {
        requiredRoles: roles,
        userRole: req.user.role,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Department-based access control middleware
export const requireDepartment = (departments: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!departments.includes(req.user.department)) {
      logSecurityEvent('Department access denied', req.user.id, {
        requiredDepartments: departments,
        userDepartment: req.user.department,
        path: req.path,
      });
      res.status(403).json({
        success: false,
        error: 'Access denied for your department',
      });
      return;
    }

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    
    const db = databaseService.getConnection();
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Don't fail on authentication errors for optional auth
    next();
  }
};

// Rate limiting for authentication endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};

// Password strength validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Session management
export const createSession = async (userId: string, deviceInfo?: any): Promise<string> => {
  const db = databaseService.getConnection();
  const sessionId = require('crypto').randomBytes(32).toString('hex');
  
  await db('user_sessions').insert({
    id: sessionId,
    user_id: userId,
    device_info: deviceInfo ? JSON.stringify(deviceInfo) : null,
    created_at: new Date(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });
  
  return sessionId;
};

export const validateSession = async (sessionId: string): Promise<User | null> => {
  const db = databaseService.getConnection();
  
  const session = await db('user_sessions')
    .where({ id: sessionId })
    .where('expires_at', '>', new Date())
    .first();
  
  if (!session) {
    return null;
  }
  
  const user = await db('users')
    .where({ id: session.user_id, is_active: true })
    .first();
  
  return user || null;
};

export const invalidateSession = async (sessionId: string): Promise<void> => {
  const db = databaseService.getConnection();
  await db('user_sessions')
    .where({ id: sessionId })
    .delete();
}; 