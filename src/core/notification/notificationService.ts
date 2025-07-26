import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { cacheService } from '../../services/redisService';
import { logger } from '../../utils/logger';
import { 
  ValidationError, 
  NotFoundError 
} from '../../middleware/errorHandler';

export interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  recipient_id?: string;
  recipient_department_id?: string;
  recipient_company_id?: string;
  recipient_role_id?: string;
  data?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  expires_at?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  title_template: string;
  message_template: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  recipient_id: string;
  sender_id?: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  is_delivered: boolean;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  notification_type: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationFilters {
  recipient_id?: string;
  type?: string;
  priority?: string;
  is_read?: boolean;
  is_delivered?: boolean;
  page?: number;
  limit?: number;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData, senderId?: string): Promise<Notification[]> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateNotificationData(data);

      // Determine recipients
      const recipients = await this.determineRecipients(data);
      if (recipients.length === 0) {
        logger.warn('No recipients found for notification', { data });
        return [];
      }

      // Create notifications for each recipient
      const notifications: Notification[] = [];
      
      for (const recipientId of recipients) {
        const notification = await this.createSingleNotification({
          ...data,
          recipient_id: recipientId,
          sender_id: senderId
        });
        
        notifications.push(notification);
      }

      // Send real-time notifications
      await this.sendRealTimeNotifications(notifications);

      logger.info('Notifications created successfully', {
        count: notifications.length,
        type: data.type,
        senderId
      });

      return notifications;
    } catch (error) {
      logger.error('Error creating notification', { error, data });
      throw error;
    }
  }

  /**
   * Create notification from template
   */
  async createNotificationFromTemplate(
    templateName: string,
    recipientData: CreateNotificationData,
    templateData: Record<string, any>,
    senderId?: string
  ): Promise<Notification[]> {
    try {
      const db = getDatabase();
      // Get template
      const template = await this.getNotificationTemplateByName(templateName);
      if (!template) {
        throw new NotFoundError(`Notification template '${templateName}' not found`);
      }

      // Render template
      const title = this.renderTemplate(template.title_template, templateData);
      const message = this.renderTemplate(template.message_template, templateData);

      // Create notification
      return this.createNotification({
        ...recipientData,
        type: template.type,
        title,
        message
      }, senderId);
    } catch (error) {
      logger.error('Error creating notification from template', { error, templateName });
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {}
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('notifications')
        .where('recipient_id', userId)
        .where('deleted_at', null);

      // Apply filters
      if (filters.type) {
        query = query.where('type', filters.type);
      }

      if (filters.priority) {
        query = query.where('priority', filters.priority);
      }

      if (filters.is_read !== undefined) {
        query = query.where('is_read', filters.is_read);
      }

      if (filters.is_delivered !== undefined) {
        query = query.where('is_delivered', filters.is_delivered);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get unread count
      const [{ unreadCount }] = await db('notifications')
        .where('recipient_id', userId)
        .where('is_read', false)
        .where('deleted_at', null)
        .count('* as unreadCount');

      // Get paginated results
      const notifications = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        notifications,
        total: parseInt(count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count) / limit),
        unreadCount: parseInt(unreadCount)
      };
    } catch (error) {
      logger.error('Error fetching user notifications', { error, userId });
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = await db('notifications')
        .where('id', notificationId)
        .where('recipient_id', userId)
        .update({
          is_read: true,
          updated_at: new Date()
        });

      if (result === 0) {
        throw new NotFoundError('Notification not found');
      }

      logger.info('Notification marked as read', { notificationId, userId });
    } catch (error) {
      logger.error('Error marking notification as read', { error, notificationId, userId });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markNotificationsAsRead(notificationIds: string[], userId: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = await db('notifications')
        .whereIn('id', notificationIds)
        .where('recipient_id', userId)
        .update({
          is_read: true,
          updated_at: new Date()
        });

      logger.info('Multiple notifications marked as read', { 
        count: result, 
        notificationIds, 
        userId 
      });
    } catch (error) {
      logger.error('Error marking notifications as read', { error, notificationIds, userId });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = await db('notifications')
        .where('recipient_id', userId)
        .where('is_read', false)
        .update({
          is_read: true,
          updated_at: new Date()
        });

      logger.info('All notifications marked as read', { count: result, userId });
    } catch (error) {
      logger.error('Error marking all notifications as read', { error, userId });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const db = getDatabase();
      const result = await db('notifications')
        .where('id', notificationId)
        .where('recipient_id', userId)
        .update({
          deleted_at: new Date(),
          updated_at: new Date()
        });

      if (result === 0) {
        throw new NotFoundError('Notification not found');
      }

      logger.info('Notification deleted', { notificationId, userId });
    } catch (error) {
      logger.error('Error deleting notification', { error, notificationId, userId });
      throw error;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences[]> {
    try {
      const db = getDatabase();
      const preferences = await db('notification_preferences')
        .where('user_id', userId)
        .orderBy('notification_type');

      return preferences;
    } catch (error) {
      logger.error('Error fetching notification preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Array<{
      notification_type: string;
      email_enabled: boolean;
      push_enabled: boolean;
      in_app_enabled: boolean;
    }>
  ): Promise<void> {
    try {
      const db = getDatabase();
      await db.transaction(async (trx) => {
        for (const pref of preferences) {
          await trx('notification_preferences')
            .where('user_id', userId)
            .where('notification_type', pref.notification_type)
            .update({
              email_enabled: pref.email_enabled,
              push_enabled: pref.push_enabled,
              in_app_enabled: pref.in_app_enabled,
              updated_at: new Date()
            });
        }
      });

      logger.info('Notification preferences updated', { userId, preferences });
    } catch (error) {
      logger.error('Error updating notification preferences', { error, userId });
      throw error;
    }
  }

  /**
   * Create notification template
   */
  async createNotificationTemplate(data: {
    name: string;
    type: string;
    title_template: string;
    message_template: string;
    is_active?: boolean;
  }): Promise<NotificationTemplate> {
    try {
      const db = getDatabase();
      const [template] = await db('notification_templates').insert({
        id: uuidv4(),
        name: data.name,
        type: data.type,
        title_template: data.title_template,
        message_template: data.message_template,
        is_active: data.is_active ?? true
      }).returning('*');

      logger.info('Notification template created', { templateId: template.id, name: template.name });
      return template;
    } catch (error) {
      logger.error('Error creating notification template', { error, data });
      throw error;
    }
  }

  /**
   * Get notification template by name
   */
  async getNotificationTemplateByName(name: string): Promise<NotificationTemplate | null> {
    try {
      const db = getDatabase();
      const template = await db('notification_templates')
        .where('name', name)
        .where('is_active', true)
        .first();

      return template || null;
    } catch (error) {
      logger.error('Error fetching notification template', { error, name });
      throw error;
    }
  }

  /**
   * Create single notification
   */
  private async createSingleNotification(data: CreateNotificationData & { sender_id?: string }): Promise<Notification> {
    const db = getDatabase();
    const [notification] = await db('notifications').insert({
      id: uuidv4(),
      type: data.type,
      title: data.title,
      message: data.message,
      recipient_id: data.recipient_id!,
      sender_id: data.sender_id,
      data: data.data ? JSON.stringify(data.data) : null,
      priority: data.priority || 'medium',
      is_read: false,
      is_delivered: false,
      expires_at: data.expires_at
    }).returning('*');

    return {
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : undefined
    };
  }

  /**
   * Determine recipients based on notification data
   */
  private async determineRecipients(data: CreateNotificationData): Promise<string[]> {
    const db = getDatabase();
    const recipients: string[] = [];

    if (data.recipient_id) {
      recipients.push(data.recipient_id);
    }

    if (data.recipient_department_id) {
      const departmentUsers = await db('users')
        .select('id')
        .where('department_id', data.recipient_department_id)
        .where('is_active', true)
        .where('deleted_at', null);

      recipients.push(...departmentUsers.map(u => u.id));
    }

    if (data.recipient_company_id) {
      const companyUsers = await db('users')
        .select('id')
        .where('company_id', data.recipient_company_id)
        .where('is_active', true)
        .where('deleted_at', null);

      recipients.push(...companyUsers.map(u => u.id));
    }

    if (data.recipient_role_id) {
      const roleUsers = await db('users')
        .select('users.id')
        .join('user_roles', 'users.id', 'user_roles.user_id')
        .where('user_roles.role_id', data.recipient_role_id)
        .where('users.is_active', true)
        .where('users.deleted_at', null);

      recipients.push(...roleUsers.map(u => u.id));
    }

    // Remove duplicates
    return [...new Set(recipients)];
  }

  /**
   * Send real-time notifications via Socket.IO
   */
  private async sendRealTimeNotifications(notifications: Notification[]): Promise<void> {
    try {
      const db = getDatabase();
      for (const notification of notifications) {
        // Send to specific user
        // Assuming socketService is available globally or imported elsewhere
        // If not, this line would cause an error.
        // For now, keeping it as is, but it might need adjustment depending on the actual import.
        // @ts-ignore
        if (typeof window !== 'undefined' && window.io) {
          // @ts-ignore
          window.io.to(`user:${notification.recipient_id}`).emit('notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            data: notification.data,
            created_at: notification.created_at
          });
        } else {
          logger.warn('Socket.IO not available, skipping real-time notification for', { notificationId: notification.id });
        }

        // Mark as delivered
        await db('notifications')
          .where('id', notification.id)
          .update({
            is_delivered: true,
            updated_at: new Date()
          });
      }
    } catch (error) {
      logger.error('Error sending real-time notifications', { error });
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Validate notification data
   */
  private validateNotificationData(data: CreateNotificationData): void {
    if (!data.type || data.type.trim().length === 0) {
      throw new ValidationError('Notification type is required');
    }

    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Notification title is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new ValidationError('Notification message is required');
    }

    if (!data.recipient_id && !data.recipient_department_id && 
        !data.recipient_company_id && !data.recipient_role_id) {
      throw new ValidationError('At least one recipient must be specified');
    }

    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      throw new ValidationError('Invalid priority level');
    }
  }
}

export const notificationService = new NotificationService(); 