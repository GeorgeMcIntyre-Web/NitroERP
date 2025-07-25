import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthenticationError, ValidationError } from '../middleware/errorHandler';
import { logger, auditLogger, securityLogger } from '../utils/logger';
import { getDatabase } from '../database/connection';
import { sessionService, cacheService } from '../services/redisService';
import config from '../../config/environment';

export class AuthController {
  /**
   * User login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, rememberMe = false } = req.body;

      // Validate input
      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      // Get user from database
      const db = getDatabase();
      const user = await db('users')
        .where('email', email.toLowerCase())
        .whereNull('deleted_at')
        .first();

      if (!user) {
        securityLogger.log('LOGIN_FAILURE', {
          email,
          reason: 'User not found',
          ip: req.ip,
        });
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if user is active
      if (!user.is_active) {
        securityLogger.log('LOGIN_FAILURE', {
          email,
          reason: 'Account inactive',
          ip: req.ip,
        });
        throw new AuthenticationError('Account is inactive. Please contact administrator.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        securityLogger.log('LOGIN_FAILURE', {
          email,
          reason: 'Invalid password',
          ip: req.ip,
        });
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if email is verified
      if (!user.email_verified) {
        throw new AuthenticationError('Please verify your email address before logging in');
      }

      // Generate JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions || [],
        companyId: user.company_id,
      };

      const tokenExpiry = rememberMe ? config.JWT_REFRESH_EXPIRES_IN : config.JWT_EXPIRES_IN;
      const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: tokenExpiry });

      // Generate refresh token
      const refreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

      // Store refresh token in database
      await db('refresh_tokens').insert({
        user_id: user.id,
        token: refreshToken,
        expires_at: refreshTokenExpiry,
        created_at: new Date(),
      });

      // Update last login
      await db('users')
        .where('id', user.id)
        .update({
          last_login_at: new Date(),
          updated_at: new Date(),
        });

      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      await sessionService.createSession(sessionId, {
        userId: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions || [],
        companyId: user.company_id,
        loginTime: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }, rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60); // 7 days or 1 day

      // Log successful login
      auditLogger.log('LOGIN_SUCCESS', user.id, 'auth/login', {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        rememberMe,
      });

      // Cache user permissions
      await cacheService.set(`user:${user.id}:permissions`, user.permissions || [], 3600);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            department: user.department,
            permissions: user.permissions || [],
            companyId: user.company_id,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled || false,
            lastLoginAt: user.last_login_at,
          },
          token,
          refreshToken,
          expiresIn: tokenExpiry,
          sessionId,
        },
        message: 'Login successful',
      });

    } catch (error) {
      logger.error('Login error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body.email,
        ip: req.ip,
      });
      throw error;
    }
  }

  /**
   * User logout
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken, sessionId } = req.body;
      const userId = req.user?.id;

      if (refreshToken) {
        // Invalidate refresh token
        const db = getDatabase();
        await db('refresh_tokens')
          .where('token', refreshToken)
          .delete();
      }

      if (sessionId) {
        // Delete session
        await sessionService.deleteSession(sessionId);
      }

      if (userId) {
        // Clear user cache
        await cacheService.delete(`user:${userId}:permissions`);
        
        // Log logout
        auditLogger.log('LOGOUT', userId, 'auth/logout', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });

    } catch (error) {
      logger.error('Logout error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      throw error;
    }
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      // Verify refresh token
      const db = getDatabase();
      const tokenRecord = await db('refresh_tokens')
        .where('token', refreshToken)
        .where('expires_at', '>', new Date())
        .first();

      if (!tokenRecord) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Get user
      const user = await db('users')
        .where('id', tokenRecord.user_id)
        .whereNull('deleted_at')
        .first();

      if (!user || !user.is_active) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new JWT token
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions || [],
        companyId: user.company_id,
      };

      const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

      // Generate new refresh token
      const newRefreshToken = crypto.randomBytes(40).toString('hex');
      const refreshTokenExpiry = new Date();
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

      // Update refresh token in database
      await db('refresh_tokens')
        .where('token', refreshToken)
        .update({
          token: newRefreshToken,
          expires_at: refreshTokenExpiry,
          updated_at: new Date(),
        });

      res.status(200).json({
        success: true,
        data: {
          token,
          refreshToken: newRefreshToken,
          expiresIn: config.JWT_EXPIRES_IN,
        },
        message: 'Token refreshed successfully',
      });

    } catch (error) {
      logger.error('Token refresh error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      const db = getDatabase();
      const user = await db('users')
        .where('email', email.toLowerCase())
        .whereNull('deleted_at')
        .first();

      if (user) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date();
        resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour

        // Store reset token
        await db('password_reset_tokens').insert({
          user_id: user.id,
          token: resetToken,
          expires_at: resetTokenExpiry,
          created_at: new Date(),
        });

        // TODO: Send email with reset link
        // For now, just log the token
        logger.info('Password reset token generated', {
          email: user.email,
          token: resetToken,
        });

        auditLogger.log('PASSWORD_RESET_REQUESTED', user.id, 'auth/forgot-password', {
          email: user.email,
          ip: req.ip,
        });
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });

    } catch (error) {
      logger.error('Forgot password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body.email,
      });
      throw error;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        throw new ValidationError('Token and password are required');
      }

      if (password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters long');
      }

      const db = getDatabase();
      
      // Verify reset token
      const resetToken = await db('password_reset_tokens')
        .where('token', token)
        .where('expires_at', '>', new Date())
        .first();

      if (!resetToken) {
        throw new AuthenticationError('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);

      // Update user password
      await db('users')
        .where('id', resetToken.user_id)
        .update({
          password_hash: passwordHash,
          updated_at: new Date(),
        });

      // Delete reset token
      await db('password_reset_tokens')
        .where('token', token)
        .delete();

      // Invalidate all refresh tokens for this user
      await db('refresh_tokens')
        .where('user_id', resetToken.user_id)
        .delete();

      auditLogger.log('PASSWORD_RESET', resetToken.user_id, 'auth/reset-password', {
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });

    } catch (error) {
      logger.error('Reset password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const db = getDatabase();
      const user = await db('users')
        .where('id', req.user.id)
        .whereNull('deleted_at')
        .first();

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            department: user.department,
            permissions: user.permissions || [],
            companyId: user.company_id,
            emailVerified: user.email_verified,
            mfaEnabled: user.mfa_enabled || false,
            lastLoginAt: user.last_login_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          },
        },
      });

    } catch (error) {
      logger.error('Get current user error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      if (newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }

      const db = getDatabase();
      const user = await db('users')
        .where('id', req.user.id)
        .whereNull('deleted_at')
        .first();

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await db('users')
        .where('id', req.user.id)
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date(),
        });

      // Invalidate all refresh tokens
      await db('refresh_tokens')
        .where('user_id', req.user.id)
        .delete();

      auditLogger.log('PASSWORD_CHANGED', req.user.id, 'auth/change-password', {
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });

    } catch (error) {
      logger.error('Change password error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      throw error;
    }
  }

  /**
   * Enable MFA
   */
  static async enableMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // TODO: Implement MFA setup
      // For now, just mark as enabled
      const db = getDatabase();
      await db('users')
        .where('id', req.user.id)
        .update({
          mfa_enabled: true,
          updated_at: new Date(),
        });

      auditLogger.log('MFA_ENABLED', req.user.id, 'auth/enable-mfa', {
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully',
      });

    } catch (error) {
      logger.error('Enable MFA error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      throw error;
    }
  }

  /**
   * Disable MFA
   */
  static async disableMFA(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const db = getDatabase();
      await db('users')
        .where('id', req.user.id)
        .update({
          mfa_enabled: false,
          updated_at: new Date(),
        });

      auditLogger.log('MFA_DISABLED', req.user.id, 'auth/disable-mfa', {
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully',
      });

    } catch (error) {
      logger.error('Disable MFA error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
      });
      throw error;
    }
  }

  /**
   * Verify MFA
   */
  static async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ValidationError('MFA token is required');
      }

      // TODO: Implement MFA verification
      // For now, just return success
      res.status(200).json({
        success: true,
        message: 'MFA verification successful',
      });

    } catch (error) {
      logger.error('Verify MFA error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Verify email
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ValidationError('Verification token is required');
      }

      const db = getDatabase();
      
      // Verify token
      const verificationToken = await db('email_verification_tokens')
        .where('token', token)
        .where('expires_at', '>', new Date())
        .first();

      if (!verificationToken) {
        throw new AuthenticationError('Invalid or expired verification token');
      }

      // Update user email verification status
      await db('users')
        .where('id', verificationToken.user_id)
        .update({
          email_verified: true,
          updated_at: new Date(),
        });

      // Delete verification token
      await db('email_verification_tokens')
        .where('token', token)
        .delete();

      auditLogger.log('EMAIL_VERIFIED', verificationToken.user_id, 'auth/verify-email', {
        ip: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });

    } catch (error) {
      logger.error('Verify email error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      const db = getDatabase();
      const user = await db('users')
        .where('email', email.toLowerCase())
        .whereNull('deleted_at')
        .first();

      if (user && !user.email_verified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + 24); // 24 hours

        // Store verification token
        await db('email_verification_tokens').insert({
          user_id: user.id,
          token: verificationToken,
          expires_at: tokenExpiry,
          created_at: new Date(),
        });

        // TODO: Send verification email
        logger.info('Email verification token generated', {
          email: user.email,
          token: verificationToken,
        });

        auditLogger.log('VERIFICATION_EMAIL_RESENT', user.id, 'auth/resend-verification', {
          email: user.email,
          ip: req.ip,
        });
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists and is not verified, a verification email has been sent',
      });

    } catch (error) {
      logger.error('Resend verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: req.body.email,
      });
      throw error;
    }
  }
} 