import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { cacheService } from '../../services/redisService';
import { logger } from '../../utils/logger';
import { 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  AuthorizationError 
} from '../../middleware/errorHandler';

export interface CreateUserData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_id: string;
  department_id: string;
  role_ids?: string[];
  is_active?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  company_id?: string;
  department_id?: string;
  is_active?: boolean;
  role_ids?: string[];
}

export interface UserFilters {
  company_id?: string;
  department_id?: string;
  is_active?: boolean;
  role_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserWithRoles {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_id: string;
  department_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  permissions: string[];
}

export class UserService {
  private readonly SALT_ROUNDS = 12;

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData, createdBy: string): Promise<UserWithRoles> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateUserData(data);

      // Check if email already exists
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

      // Start transaction
      const result = await db.transaction(async (trx) => {
        // Create user
        const [user] = await trx('users').insert({
          id: uuidv4(),
          email: data.email.toLowerCase(),
          password_hash: passwordHash,
          first_name: data.first_name,
          last_name: data.last_name,
          company_id: data.company_id,
          department_id: data.department_id,
          is_active: data.is_active ?? true,
          created_by: createdBy,
          updated_by: createdBy
        }).returning('*');

        // Assign roles if provided
        if (data.role_ids && data.role_ids.length > 0) {
          const userRoles = data.role_ids.map(roleId => ({
            id: uuidv4(),
            user_id: user.id,
            role_id: roleId,
            created_by: createdBy
          }));

          await trx('user_roles').insert(userRoles);
        }

        return user;
      });

      // Get user with roles
      const userWithRoles = await this.getUserWithRolesById(result.id);
      if (!userWithRoles) {
        throw new Error('Failed to create user');
      }

      // Clear cache
      await this.clearUserCache(result.id);

      logger.info('User created successfully', {
        userId: result.id,
        email: result.email,
        createdBy
      });

      return userWithRoles;
    } catch (error) {
      logger.error('Error creating user', { error, data: { ...data, password: '[REDACTED]' } });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserWithRoles | null> {
    try {
      // Check cache first
      const cached = await cacheService.get(`user:${userId}`);
      if (cached) {
        return JSON.parse(cached as string);
      }

      const user = await this.getUserWithRolesById(userId);
      
      if (user) {
        // Cache user data
        await cacheService.set(`user:${userId}`, JSON.stringify(user), 3600); // 1 hour
      }

      return user;
    } catch (error) {
      logger.error('Error fetching user by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserWithRoles | null> {
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
        .where('users.email', email.toLowerCase())
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
      logger.error('Error fetching user by email', { error, email });
      throw error;
    }
  }

  /**
   * Get users with filters and pagination
   */
  async getUsers(filters: UserFilters = {}, currentUser: { company_id: string; permissions: string[] }): Promise<{
    users: UserWithRoles[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('users')
        .select(
          'users.*',
          db.raw('array_agg(DISTINCT roles.name) as roles'),
          db.raw('array_agg(DISTINCT permissions.name) as permissions')
        )
        .leftJoin('user_roles', 'users.id', 'user_roles.user_id')
        .leftJoin('roles', 'user_roles.role_id', 'roles.id')
        .leftJoin('role_permissions', 'roles.id', 'role_permissions.role_id')
        .leftJoin('permissions', 'role_permissions.permission_id', 'permissions.id')
        .where('users.deleted_at', null)
        .groupBy('users.id');

      // Apply company filter (users can only see users from their company)
      query = query.where('users.company_id', currentUser.company_id);

      // Apply filters
      if (filters.department_id) {
        query = query.where('users.department_id', filters.department_id);
      }

      if (filters.is_active !== undefined) {
        query = query.where('users.is_active', filters.is_active);
      }

      if (filters.role_id) {
        query = query.whereExists(function() {
          this.select('*')
            .from('user_roles')
            .whereRaw('user_roles.user_id = users.id')
            .where('user_roles.role_id', filters.role_id);
        });
      }

      if (filters.search) {
        query = query.where(function() {
          this.where('users.first_name', 'ilike', `%${filters.search}%`)
            .orWhere('users.last_name', 'ilike', `%${filters.search}%`)
            .orWhere('users.email', 'ilike', `%${filters.search}%`);
        });
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get paginated results
      const users = await query
        .orderBy('users.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Transform results
      const transformedUsers = users.map(user => ({
        ...user,
        roles: user.roles.filter(Boolean),
        permissions: user.permissions.filter(Boolean)
      }));

      return {
        users: users,
        total: parseInt(count as string),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count as string) / limit)
      };
    } catch (error) {
      logger.error('Error fetching users', { error, filters });
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, data: UpdateUserData, updatedBy: string): Promise<UserWithRoles> {
    try {
      const db = getDatabase();
      // Check if user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Validate email uniqueness if being updated
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.getUserByEmail(data.email);
        if (emailExists) {
          throw new ConflictError('Email already exists');
        }
      }

      // Start transaction
      const result = await db.transaction(async (trx) => {
        // Update user
        const updateData: any = {
          updated_by: updatedBy,
          updated_at: new Date()
        };

        if (data.first_name) updateData.first_name = data.first_name;
        if (data.last_name) updateData.last_name = data.last_name;
        if (data.email) updateData.email = data.email.toLowerCase();
        if (data.company_id) updateData.company_id = data.company_id;
        if (data.department_id) updateData.department_id = data.department_id;
        if (data.is_active !== undefined) updateData.is_active = data.is_active;

        const [user] = await trx('users')
          .where('id', userId)
          .update(updateData)
          .returning('*');

        // Update roles if provided
        if (data.role_ids !== undefined) {
          // Remove existing roles
          await trx('user_roles').where('user_id', userId).del();

          // Add new roles
          if (data.role_ids.length > 0) {
            const userRoles = data.role_ids.map(roleId => ({
              id: uuidv4(),
              user_id: userId,
              role_id: roleId,
              created_by: updatedBy
            }));

            await trx('user_roles').insert(userRoles);
          }
        }

        return user;
      });

      // Get updated user with roles
      const updatedUser = await this.getUserWithRolesById(result.id);
      if (!updatedUser) {
        throw new Error('Failed to update user');
      }

      // Clear cache
      await this.clearUserCache(userId);

      logger.info('User updated successfully', {
        userId,
        updatedBy,
        changes: Object.keys(data)
      });

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user', { error, userId, data });
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      const db = getDatabase();
      // Check if user exists
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Soft delete user
      await db('users')
        .where('id', userId)
        .update({
          deleted_at: new Date(),
          updated_by: deletedBy,
          updated_at: new Date()
        });

      // Clear cache
      await this.clearUserCache(userId);

      logger.info('User deleted successfully', {
        userId,
        deletedBy
      });
    } catch (error) {
      logger.error('Error deleting user', { error, userId });
      throw error;
    }
  }

  /**
   * Activate/Deactivate user
   */
  async toggleUserStatus(userId: string, isActive: boolean, updatedBy: string): Promise<UserWithRoles> {
    try {
      const db = getDatabase();
      const result = await db('users')
        .where('id', userId)
        .update({
          is_active: isActive,
          updated_by: updatedBy,
          updated_at: new Date()
        })
        .returning('*');

      if (result.length === 0) {
        throw new NotFoundError('User not found');
      }

      // Get updated user with roles
      const updatedUser = await this.getUserWithRolesById(userId);
      if (!updatedUser) {
        throw new Error('Failed to update user status');
      }

      // Clear cache
      await this.clearUserCache(userId);

      logger.info('User status updated', {
        userId,
        isActive,
        updatedBy
      });

      return updatedUser;
    } catch (error) {
      logger.error('Error updating user status', { error, userId, isActive });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      const db = getDatabase();
      // Verify current password
      const user = await db('users')
        .select('password_hash')
        .where('id', userId)
        .where('deleted_at', null)
        .first();

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        throw new ValidationError('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      await db('users')
        .where('id', userId)
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date()
        });

      // Clear cache
      await this.clearUserCache(userId);

      logger.info('User password changed successfully', { userId });
    } catch (error) {
      logger.error('Error changing password', { error, userId });
      throw error;
    }
  }

  /**
   * Get user with roles by ID
   */
  private async getUserWithRolesById(userId: string): Promise<UserWithRoles | null> {
    try {
      const db = getDatabase();
      const user = await db('users')
        .select(
          'users.*',
          db.raw(`
            json_agg(
              DISTINCT jsonb_build_object(
                'id', roles.id,
                'name', roles.name,
                'description', roles.description
              )
            ) FILTER (WHERE roles.id IS NOT NULL) as roles
          `),
          db.raw('array_agg(DISTINCT permissions.name) FILTER (WHERE permissions.name IS NOT NULL) as permissions')
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
        roles: user.roles || [],
        permissions: user.permissions || []
      };
    } catch (error) {
      logger.error('Error fetching user with roles by ID', { error, userId });
      throw error;
    }
  }

  /**
   * Validate user data
   */
  private validateUserData(data: CreateUserData): void {
    if (!data.email || !data.email.includes('@')) {
      throw new ValidationError('Valid email is required');
    }

    if (!data.password || data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!data.first_name || data.first_name.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!data.last_name || data.last_name.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (!data.company_id) {
      throw new ValidationError('Company ID is required');
    }

    if (!data.department_id) {
      throw new ValidationError('Department ID is required');
    }
  }

  /**
   * Clear user cache
   */
  private async clearUserCache(userId: string): Promise<void> {
    try {
      await cacheService.delete(`user:${userId}`);
    } catch (error) {
      logger.error('Error clearing user cache', { error, userId });
    }
  }
}

export const userService = new UserService(); 