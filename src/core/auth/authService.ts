import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { cacheService } from '../../services/redisService';
import { logger } from '../../utils/logger';
import { 
  AuthenticationError, 
  ValidationError, 
  NotFoundError 
} from '../../middleware/errorHandler';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  department_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithRoles extends User {
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  companyId: string;
  departmentId: string;
  roles: string[];
  permissions: string[];
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;
  private readonly REFRESH_TOKEN_EXPIRES_IN: number;

  constructor() {
    this.JWT_SECRET = (process.env.JWT_SECRET as string) || 'your-secret-key';
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
    this.REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '604800'); // 7 days
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(credentials: LoginCredentials): Promise<{
    user: UserWithRoles;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const { email, password } = credentials;

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Find user with roles and permissions
      const user = await this.getUserWithRoles(email);
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Check if user is active
      if (!user.is_active) {
        throw new AuthenticationError('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.id);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store refresh token in Redis
      await this.storeRefreshToken(user.id, refreshToken);

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        companyId: user.company_id,
        departmentId: user.department_id
      });

      return { user, accessToken, refreshToken };
    } catch (error) {
      logger.error('Authentication failed', { error, email: credentials.email });
      throw error;
    }
  }

  /**
   * Get user with roles and permissions
   */
  async getUserWithRoles(email: string): Promise<UserWithRoles | null> {
    try {
      const db = getDatabase();
      const user = await db('users')
        .select(
          'users.*',
          db.raw('array_agg(DISTINCT roles.name) as roles'),
          db.raw('array_agg(DISTINCT permissions.name) as permissions')
        )
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('users.email', email)
        .where('users.deleted_at', null)
        .groupBy('users.id')
        .first();

      if (!user) return null;

      return {
        ...user,
        roles: user.roles.filter(Boolean),
        permissions: user.permissions.filter(Boolean)
      };
    } catch (error) {
      logger.error('Error fetching user with roles', { error, email });
      throw error;
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(password: string, userId: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const user = await db('users')
        .select('password_hash')
        .where('id', userId)
        .where('deleted_at', null)
        .first();

      if (!user) return false;

      return bcrypt.compare(password, user.password_hash);
    } catch (error) {
      logger.error('Error verifying password', { error, userId });
      return false;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user: UserWithRoles): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      companyId: user.company_id,
      departmentId: user.department_id,
      roles: user.roles,
      permissions: user.permissions
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'nitroerp',
      audience: 'nitroerp-users'
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    return uuidv4();
  }

  /**
   * Store refresh token in Redis
   */
  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      await cacheService.set(key, refreshToken, this.REFRESH_TOKEN_EXPIRES_IN);
    } catch (error) {
      logger.error('Error storing refresh token', { error, userId });
      throw error;
    }
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    try {
      const key = `refresh_token:${userId}`;
      const storedToken = await cacheService.get(key);
      return storedToken === refreshToken;
    } catch (error) {
      logger.error('Error validating refresh token', { error, userId });
      return false;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId: string, refreshToken: string): Promise<{
    accessToken: string;
    newRefreshToken: string;
  }> {
    try {
      // Validate refresh token
      const isValid = await this.validateRefreshToken(userId, refreshToken);
      if (!isValid) {
        throw new AuthenticationError('Invalid refresh token');
      }

      // Get user with roles
      const user = await this.getUserWithRolesById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate new tokens
      const accessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(userId);

      // Store new refresh token
      await this.storeRefreshToken(userId, newRefreshToken);

      // Invalidate old refresh token
      await this.invalidateRefreshToken(userId, refreshToken);

      return { accessToken, newRefreshToken };
    } catch (error) {
      logger.error('Error refreshing access token', { error, userId });
      throw error;
    }
  }

  /**
   * Get user with roles by ID
   */
  async getUserWithRolesById(userId: string): Promise<UserWithRoles | null> {
    try {
      const db = getDatabase();
      const user = await db('users')
        .select(
          'users.*',
          db.raw('array_agg(DISTINCT roles.name) as roles'),
          db.raw('array_agg(DISTINCT permissions.name) as permissions')
        )
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('users.id', userId)
        .where('users.deleted_at', null)
        .groupBy('users.id')
        .first();

      if (!user) return null;

      return {
        ...user,
        roles: user.roles.filter(Boolean),
        permissions: user.permissions.filter(Boolean)
      };
    } catch (error) {
      logger.error('Error fetching user with roles by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Invalidate refresh token
   */
  async invalidateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      await cacheService.delete(key);
    } catch (error) {
      logger.error('Error invalidating refresh token', { error, userId });
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      await this.invalidateRefreshToken(userId, refreshToken);
      
      // Clear user session
      const sessionKey = `session:${userId}`;
      await cacheService.delete(sessionKey);

      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Error during logout', { error, userId });
      throw error;
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'nitroerp',
        audience: 'nitroerp-users'
      }) as TokenPayload;

      return decoded;
    } catch (error) {
      logger.error('Error verifying access token', { error });
      throw new AuthenticationError('Invalid access token');
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has role
   */
  hasRole(userRoles: string[], requiredRole: string): boolean {
    return userRoles.includes(requiredRole);
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  }

  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(role => 
      userRoles.includes(role)
    );
  }
}

export const authService = new AuthService(); 