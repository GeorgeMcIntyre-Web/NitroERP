import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import { logger, securityLogger, auditLogger } from '../utils/logger';
import config from '../../config/environment';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        department: string;
        permissions: string[];
        companyId: string;
      };
    }
  }
}

// JWT payload interface
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  department: string;
  permissions: string[];
  companyId: string;
  iat: number;
  exp: number;
}

// Permission levels
export enum PermissionLevel {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

// Department permissions mapping
const DEPARTMENT_PERMISSIONS = {
  FINANCE: ['financial:read', 'financial:write', 'financial:delete'],
  HR: ['hr:read', 'hr:write', 'hr:delete'],
  ENGINEERING: ['engineering:read', 'engineering:write', 'engineering:delete'],
  MANUFACTURING: ['manufacturing:read', 'manufacturing:write', 'manufacturing:delete'],
  CONTROL: ['control:read', 'control:write', 'control:delete'],
  ADMIN: ['*'], // All permissions
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['*'], // All permissions
  ADMIN: ['*'], // All permissions
  MANAGER: ['read', 'write'],
  USER: ['read'],
  VIEWER: ['read'],
};

/**
 * Verify JWT token and extract user information
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
};

/**
 * Extract token from request headers
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Main authentication middleware
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Check if token is expired
    if (decoded.exp < Date.now() / 1000) {
      throw new AuthenticationError('Token expired');
    }

    // Set user information in request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      department: decoded.department,
      permissions: decoded.permissions,
      companyId: decoded.companyId,
    };

    // Log successful authentication
    auditLogger.log('AUTH_SUCCESS', decoded.id, req.path, {
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    // Log authentication failure
    securityLogger.log('AUTH_FAILURE', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    next(error);
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      auditLogger.log('AUTHORIZATION_FAILURE', req.user.id, req.path, {
        requiredRoles: allowedRoles,
        userRole,
        method: req.method,
      });

      throw new AuthorizationError(`Insufficient role. Required: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userPermissions = req.user.permissions;

    // Check if user has wildcard permission
    if (userPermissions.includes('*')) {
      return next();
    }

    // Check if user has specific permission
    if (!userPermissions.includes(permission)) {
      auditLogger.log('PERMISSION_FAILURE', req.user.id, req.path, {
        requiredPermission: permission,
        userPermissions,
        method: req.method,
      });

      throw new AuthorizationError(`Insufficient permissions. Required: ${permission}`);
    }

    next();
  };
};

/**
 * Department-based access control middleware
 */
export const requireDepartment = (departments: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const userDepartment = req.user.department;
    const allowedDepartments = Array.isArray(departments) ? departments : [departments];

    if (!allowedDepartments.includes(userDepartment)) {
      auditLogger.log('DEPARTMENT_ACCESS_FAILURE', req.user.id, req.path, {
        requiredDepartments: allowedDepartments,
        userDepartment,
        method: req.method,
      });

      throw new AuthorizationError(`Access denied for department. Required: ${allowedDepartments.join(', ')}`);
    }

    next();
  };
};

/**
 * Resource ownership middleware
 */
export const requireOwnership = (resourceUserIdField: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Allow admins to access any resource
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      auditLogger.log('OWNERSHIP_FAILURE', req.user.id, req.path, {
        resourceUserId,
        userRole: req.user.role,
        method: req.method,
      });

      throw new AuthorizationError('Access denied. You can only access your own resources.');
    }

    next();
  };
};

/**
 * Company-based access control middleware
 */
export const requireCompanyAccess = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    const resourceCompanyId = req.params.companyId || req.body.companyId;
    
    if (resourceCompanyId && resourceCompanyId !== req.user.companyId) {
      auditLogger.log('COMPANY_ACCESS_FAILURE', req.user.id, req.path, {
        resourceCompanyId,
        userCompanyId: req.user.companyId,
        method: req.method,
      });

      throw new AuthorizationError('Access denied. You can only access resources from your company.');
    }

    next();
  };
};

/**
 * Multi-factor authentication middleware (placeholder for future implementation)
 */
export const requireMFA = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: Implement MFA verification
    // For now, just check if MFA is enabled for the user
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Check if MFA is required for this user/action
    const mfaRequired = req.headers['x-mfa-required'] === 'true';
    
    if (mfaRequired) {
      const mfaToken = req.headers['x-mfa-token'];
      
      if (!mfaToken) {
        throw new AuthenticationError('MFA token required');
      }

      // TODO: Verify MFA token
      // For now, just log the attempt
      auditLogger.log('MFA_ATTEMPT', req.user.id, req.path, {
        mfaToken: '***',
        method: req.method,
      });
    }

    next();
  };
};

/**
 * Rate limiting for authentication attempts
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip;
    const now = Date.now();

    const attempt = attempts.get(ip);
    
    if (!attempt || now > attempt.resetTime) {
      attempts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (attempt.count >= maxAttempts) {
      securityLogger.log('AUTH_RATE_LIMIT_EXCEEDED', {
        ip,
        attempts: attempt.count,
        windowMs,
      });

      throw new AuthenticationError('Too many authentication attempts. Please try again later.');
    }

    attempt.count++;
    next();
  };
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const decoded = verifyToken(token);
      
      if (decoded.exp >= Date.now() / 1000) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          department: decoded.department,
          permissions: decoded.permissions,
          companyId: decoded.companyId,
        };
      }
    }
  } catch (error) {
    // Silently ignore authentication errors for optional auth
    logger.debug('Optional authentication failed:', error);
  }

  next();
}; 