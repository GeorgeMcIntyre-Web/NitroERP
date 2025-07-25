import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, Department, AuthToken, LoginCredentials, RegisterData } from '../types';
import { databaseService } from '../services/database';
import { logger, logUserAction, logSecurityEvent } from '../utils/logger';
import { validatePassword } from '../middleware/auth';
import { CustomError, AuthenticationError, ValidationError } from '../middleware/errorHandler';
import { EmailService } from '../services/email';

class AuthController {
  // Login user
  public async login(req: Request, res: Response): Promise<void> {
    const { email, password }: LoginCredentials = req.body;

    try {
      const db = databaseService.getConnection();
      
      // Find user by email
      const user = await db('users')
        .where({ email, is_active: true })
        .first();

      if (!user) {
        logSecurityEvent('Login attempt with invalid email', undefined, { email, ip: req.ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logSecurityEvent('Login attempt with invalid password', user.id, { email, ip: req.ip });
        throw new AuthenticationError('Invalid credentials');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await db('users')
        .where({ id: user.id })
        .update({ last_login: new Date() });

      // Log successful login
      logUserAction(user.id, 'login_successful', { ip: req.ip, userAgent: req.get('User-Agent') });

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
            position: user.position,
            employeeId: user.employee_id,
            avatar: user.avatar,
          },
          tokens,
        },
        message: 'Login successful',
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Login error:', error);
      throw new AuthenticationError('Login failed');
    }
  }

  // Register new user
  public async register(req: Request, res: Response): Promise<void> {
    const registerData: RegisterData = req.body;

    try {
      const db = databaseService.getConnection();

      // Check if user already exists
      const existingUser = await db('users')
        .where({ email: registerData.email })
        .first();

      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Validate password strength
      const passwordValidation = validatePassword(registerData.password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(registerData.password, saltRounds);

      // Create user
      const userId = uuidv4();
      const user = {
        id: userId,
        email: registerData.email,
        password_hash: passwordHash,
        first_name: registerData.firstName,
        last_name: registerData.lastName,
        role: registerData.role,
        department: registerData.department,
        position: registerData.position,
        employee_id: registerData.employeeId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db('users').insert(user);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(user.email, user.first_name);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }

      logUserAction(userId, 'user_registered', { email: user.email });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            department: user.department,
            position: user.position,
            employeeId: user.employee_id,
          },
          tokens,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Registration error:', error);
      throw new CustomError('Registration failed', 500);
    }
  }

  // Logout user
  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = req.user?.id;

      if (refreshToken) {
        // Invalidate refresh token
        const db = databaseService.getConnection();
        await db('refresh_tokens')
          .where({ token: refreshToken })
          .delete();
      }

      if (userId) {
        logUserAction(userId, 'logout', { ip: req.ip });
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      throw new CustomError('Logout failed', 500);
    }
  }

  // Refresh access token
  public async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token required');
    }

    try {
      const db = databaseService.getConnection();

      // Verify refresh token exists and is valid
      const tokenRecord = await db('refresh_tokens')
        .where({ token: refreshToken, expires_at: '>', new Date() })
        .first();

      if (!tokenRecord) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Get user
      const user = await db('users')
        .where({ id: tokenRecord.user_id, is_active: true })
        .first();

      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Delete old refresh token
      await db('refresh_tokens')
        .where({ token: refreshToken })
        .delete();

      res.status(200).json({
        success: true,
        data: { tokens },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Token refresh error:', error);
      throw new AuthenticationError('Token refresh failed');
    }
  }

  // Forgot password
  public async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;

    try {
      const db = databaseService.getConnection();
      
      const user = await db('users')
        .where({ email, is_active: true })
        .first();

      if (user) {
        // Generate reset token
        const resetToken = uuidv4();
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db('users')
          .where({ id: user.id })
          .update({
            password_reset_token: resetToken,
            password_reset_expires: resetExpires,
          });

        // Send reset email
        await EmailService.sendPasswordResetEmail(user.email, resetToken);

        logUserAction(user.id, 'password_reset_requested', { email });
      }

      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw new CustomError('Password reset request failed', 500);
    }
  }

  // Reset password
  public async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body;

    try {
      const db = databaseService.getConnection();

      // Find user with valid reset token
      const user = await db('users')
        .where({
          password_reset_token: token,
          is_active: true,
        })
        .where('password_reset_expires', '>', new Date())
        .first();

      if (!user) {
        throw new ValidationError('Invalid or expired reset token');
      }

      // Validate new password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update password and clear reset token
      await db('users')
        .where({ id: user.id })
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expires: null,
          updated_at: new Date(),
        });

      // Invalidate all refresh tokens for this user
      await db('refresh_tokens')
        .where({ user_id: user.id })
        .delete();

      logUserAction(user.id, 'password_reset_completed');

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Password reset error:', error);
      throw new CustomError('Password reset failed', 500);
    }
  }

  // Change password (authenticated user)
  public async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    try {
      const db = databaseService.getConnection();

      // Get user
      const user = await db('users')
        .where({ id: userId, is_active: true })
        .first();

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await db('users')
        .where({ id: userId })
        .update({
          password_hash: passwordHash,
          updated_at: new Date(),
        });

      // Invalidate all refresh tokens for this user
      await db('refresh_tokens')
        .where({ user_id: userId })
        .delete();

      logUserAction(userId, 'password_changed');

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Change password error:', error);
      throw new CustomError('Password change failed', 500);
    }
  }

  // Get user profile
  public async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    try {
      const db = databaseService.getConnection();
      
      const user = await db('users')
        .where({ id: userId, is_active: true })
        .first();

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          department: user.department,
          position: user.position,
          employeeId: user.employee_id,
          phone: user.phone,
          avatar: user.avatar,
          lastLogin: user.last_login,
          preferences: user.preferences,
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Get profile error:', error);
      throw new CustomError('Failed to get profile', 500);
    }
  }

  // Update user profile
  public async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { firstName, lastName, phone, preferences } = req.body;

    if (!userId) {
      throw new AuthenticationError('Authentication required');
    }

    try {
      const db = databaseService.getConnection();

      const updateData: any = {
        updated_at: new Date(),
      };

      if (firstName) updateData.first_name = firstName;
      if (lastName) updateData.last_name = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (preferences) updateData.preferences = preferences;

      await db('users')
        .where({ id: userId })
        .update(updateData);

      logUserAction(userId, 'profile_updated');

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      throw new CustomError('Failed to update profile', 500);
    }
  }

  // Generate JWT tokens
  private async generateTokens(user: any): Promise<AuthToken> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    const refreshToken = uuidv4();
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in database
    const db = databaseService.getConnection();
    await db('refresh_tokens').insert({
      token: refreshToken,
      user_id: user.id,
      expires_at: refreshExpires,
      created_at: new Date(),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  // Placeholder methods for future enhancements
  public async verifyEmail(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async resendVerification(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async uploadAvatar(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async getSessions(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async revokeSession(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async enable2FA(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async disable2FA(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  public async verify2FA(req: Request, res: Response): Promise<void> {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }
}

export const authController = new AuthController(); 