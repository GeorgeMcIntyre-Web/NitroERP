import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { User, UserRole, NotificationType } from '../types';
import { logger, logUserAction } from '../utils/logger';
import { databaseService } from './database';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logger.info('Socket.IO service initialized');
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        if (!process.env.JWT_SECRET) {
          return next(new Error('JWT secret not configured'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        
        // Get user from database
        const db = databaseService.getConnection();
        const user = await db('users')
          .where({ id: decoded.userId, is_active: true })
          .first();

        if (!user) {
          return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const userId = socket.user.id;
    const socketId = socket.id;

    // Track user's socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, []);
    }
    this.userSockets.get(userId)!.push(socketId);

    // Join user to their department room
    socket.join(`department:${socket.user.department}`);
    
    // Join user to their role room
    socket.join(`role:${socket.user.role}`);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    logUserAction(userId, 'socket_connected', { socketId });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle custom events
    socket.on('join_room', (room: string) => {
      socket.join(room);
      logUserAction(userId, 'socket_join_room', { room });
    });

    socket.on('leave_room', (room: string) => {
      socket.leave(room);
      logUserAction(userId, 'socket_leave_room', { room });
    });

    // Handle real-time updates
    socket.on('subscribe_to_updates', (data: { type: string; id?: string }) => {
      this.handleSubscription(socket, data);
    });

    socket.on('unsubscribe_from_updates', (data: { type: string; id?: string }) => {
      this.handleUnsubscription(socket, data);
    });

    // Handle chat messages
    socket.on('send_message', async (data: { room: string; message: string; type?: string }) => {
      await this.handleChatMessage(socket, data);
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { room: string }) => {
      socket.to(data.room).emit('user_typing_start', {
        userId: socket.user!.id,
        userName: `${socket.user!.firstName} ${socket.user!.lastName}`,
      });
    });

    socket.on('typing_stop', (data: { room: string }) => {
      socket.to(data.room).emit('user_typing_stop', {
        userId: socket.user!.id,
      });
    });

    // Handle presence updates
    socket.on('update_presence', (data: { status: 'online' | 'away' | 'busy' | 'offline' }) => {
      this.handlePresenceUpdate(socket, data);
    });

    // Emit connection confirmation
    socket.emit('connected', {
      userId: socket.user.id,
      user: {
        id: socket.user.id,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        role: socket.user.role,
        department: socket.user.department,
      },
      timestamp: new Date().toISOString(),
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    if (!socket.user) return;

    const userId = socket.user.id;
    const socketId = socket.id;

    // Remove socket from user's connections
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      const index = userSockets.indexOf(socketId);
      if (index > -1) {
        userSockets.splice(index, 1);
      }
      if (userSockets.length === 0) {
        this.userSockets.delete(userId);
      }
    }

    logUserAction(userId, 'socket_disconnected', { socketId });
  }

  private handleSubscription(socket: AuthenticatedSocket, data: { type: string; id?: string }): void {
    const room = data.id ? `${data.type}:${data.id}` : data.type;
    socket.join(room);
    logUserAction(socket.user!.id, 'socket_subscribed', { room });
  }

  private handleUnsubscription(socket: AuthenticatedSocket, data: { type: string; id?: string }): void {
    const room = data.id ? `${data.type}:${data.id}` : data.type;
    socket.leave(room);
    logUserAction(socket.user!.id, 'socket_unsubscribed', { room });
  }

  private async handleChatMessage(socket: AuthenticatedSocket, data: { room: string; message: string; type?: string }): Promise<void> {
    if (!socket.user) return;

    const messageData = {
      id: require('crypto').randomUUID(),
      userId: socket.user.id,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      message: data.message,
      type: data.type || 'text',
      timestamp: new Date().toISOString(),
    };

    // Save message to database if it's a persistent room
    if (data.room.startsWith('project:') || data.room.startsWith('department:')) {
      await this.saveChatMessage(data.room, messageData);
    }

    // Broadcast to room
    socket.to(data.room).emit('new_message', messageData);

    logUserAction(socket.user.id, 'chat_message_sent', { room: data.room, messageId: messageData.id });
  }

  private async saveChatMessage(room: string, messageData: any): Promise<void> {
    try {
      const db = databaseService.getConnection();
      await db('chat_messages').insert({
        id: messageData.id,
        room: room,
        user_id: messageData.userId,
        message: messageData.message,
        type: messageData.type,
        created_at: new Date(),
      });
    } catch (error) {
      logger.error('Failed to save chat message:', error);
    }
  }

  private handlePresenceUpdate(socket: AuthenticatedSocket, data: { status: 'online' | 'away' | 'busy' | 'offline' }): void {
    if (!socket.user) return;

    const presenceData = {
      userId: socket.user.id,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      status: data.status,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to department room
    socket.to(`department:${socket.user.department}`).emit('presence_update', presenceData);
  }

  // Public methods for emitting events
  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io!.to(socketId).emit(event, data);
      });
    }
  }

  public emitToDepartment(department: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`department:${department}`).emit(event, data);
  }

  public emitToRole(role: UserRole, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`role:${role}`).emit(event, data);
  }

  public emitToRoom(room: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(room).emit(event, data);
  }

  public emitToAll(event: string, data: any): void {
    if (!this.io) return;
    this.io.emit(event, data);
  }

  // Notification methods
  public async sendNotification(userId: string, notification: {
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }): Promise<void> {
    try {
      // Save notification to database
      const db = databaseService.getConnection();
      const notificationId = require('crypto').randomUUID();
      
      await db('notifications').insert({
        id: notificationId,
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data ? JSON.stringify(notification.data) : null,
        is_read: false,
        created_at: new Date(),
      });

      // Emit real-time notification
      this.emitToUser(userId, 'new_notification', {
        id: notificationId,
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logger.info('Notification sent', { userId, notificationId, type: notification.type });
    } catch (error) {
      logger.error('Failed to send notification:', error);
    }
  }

  // System-wide announcements
  public async sendAnnouncement(announcement: {
    title: string;
    message: string;
    departments?: string[];
    roles?: UserRole[];
  }): Promise<void> {
    try {
      const db = databaseService.getConnection();
      const announcementId = require('crypto').randomUUID();

      // Save announcement
      await db('announcements').insert({
        id: announcementId,
        title: announcement.title,
        message: announcement.message,
        departments: announcement.departments ? JSON.stringify(announcement.departments) : null,
        roles: announcement.roles ? JSON.stringify(announcement.roles) : null,
        created_at: new Date(),
      });

      // Emit to appropriate rooms
      if (announcement.departments) {
        announcement.departments.forEach(dept => {
          this.emitToDepartment(dept, 'new_announcement', {
            id: announcementId,
            ...announcement,
            timestamp: new Date().toISOString(),
          });
        });
      } else if (announcement.roles) {
        announcement.roles.forEach(role => {
          this.emitToRole(role, 'new_announcement', {
            id: announcementId,
            ...announcement,
            timestamp: new Date().toISOString(),
          });
        });
      } else {
        this.emitToAll('new_announcement', {
          id: announcementId,
          ...announcement,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info('Announcement sent', { announcementId, title: announcement.title });
    } catch (error) {
      logger.error('Failed to send announcement:', error);
    }
  }

  // Get connected users
  public getConnectedUsers(): Map<string, string[]> {
    return new Map(this.userSockets);
  }

  // Get user count
  public getUserCount(): number {
    return this.userSockets.size;
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();

// Export the class for testing
export { SocketService }; 