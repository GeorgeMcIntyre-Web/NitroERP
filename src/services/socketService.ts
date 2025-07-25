import { Server } from 'socket.io';
import { logger } from '../utils/logger';
import { verifyToken } from '../middleware/authMiddleware';

export const initializeSocketIO = (io: Server): void => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        socketId: socket.id,
      });
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    
    logger.info('Socket connected', {
      socketId: socket.id,
      userId: user?.id,
      email: user?.email,
    });

    // Join user to their department room
    if (user?.department) {
      socket.join(`department:${user.department}`);
      logger.info('User joined department room', {
        socketId: socket.id,
        userId: user.id,
        department: user.department,
      });
    }

    // Join user to their company room
    if (user?.companyId) {
      socket.join(`company:${user.companyId}`);
      logger.info('User joined company room', {
        socketId: socket.id,
        userId: user.id,
        companyId: user.companyId,
      });
    }

    // Handle private messages
    socket.on('private-message', (data) => {
      const { recipientId, message } = data;
      
      logger.info('Private message sent', {
        senderId: user?.id,
        recipientId,
        message: message.substring(0, 100), // Log first 100 chars
      });

      // Send to specific user
      io.to(`user:${recipientId}`).emit('private-message', {
        senderId: user?.id,
        senderName: `${user?.firstName} ${user?.lastName}`,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle department messages
    socket.on('department-message', (data) => {
      const { message } = data;
      
      if (user?.department) {
        logger.info('Department message sent', {
          senderId: user.id,
          department: user.department,
          message: message.substring(0, 100),
        });

        io.to(`department:${user.department}`).emit('department-message', {
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          department: user.department,
          message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle notifications
    socket.on('notification', (data) => {
      const { type, message, recipients } = data;
      
      logger.info('Notification sent', {
        senderId: user?.id,
        type,
        recipients: recipients?.length || 0,
        message: message.substring(0, 100),
      });

      if (recipients && recipients.length > 0) {
        recipients.forEach((recipientId: string) => {
          io.to(`user:${recipientId}`).emit('notification', {
            type,
            message,
            senderId: user?.id,
            senderName: `${user?.firstName} ${user?.lastName}`,
            timestamp: new Date().toISOString(),
          });
        });
      }
    });

    // Handle workflow updates
    socket.on('workflow-update', (data) => {
      const { workflowId, status, message } = data;
      
      logger.info('Workflow update', {
        userId: user?.id,
        workflowId,
        status,
        message: message.substring(0, 100),
      });

      // Broadcast to relevant users
      io.to(`workflow:${workflowId}`).emit('workflow-update', {
        workflowId,
        status,
        message,
        updatedBy: user?.id,
        updatedByName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle real-time collaboration
    socket.on('join-collaboration', (data) => {
      const { projectId, documentId } = data;
      
      socket.join(`collaboration:${projectId}:${documentId}`);
      logger.info('User joined collaboration session', {
        userId: user?.id,
        projectId,
        documentId,
      });

      // Notify other users in the session
      socket.to(`collaboration:${projectId}:${documentId}`).emit('user-joined', {
        userId: user?.id,
        userName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('leave-collaboration', (data) => {
      const { projectId, documentId } = data;
      
      socket.leave(`collaboration:${projectId}:${documentId}`);
      logger.info('User left collaboration session', {
        userId: user?.id,
        projectId,
        documentId,
      });

      // Notify other users in the session
      socket.to(`collaboration:${projectId}:${documentId}`).emit('user-left', {
        userId: user?.id,
        userName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle CAD file updates
    socket.on('cad-update', (data) => {
      const { projectId, fileId, changes } = data;
      
      logger.info('CAD file updated', {
        userId: user?.id,
        projectId,
        fileId,
        changesCount: changes?.length || 0,
      });

      // Broadcast to project team
      io.to(`project:${projectId}`).emit('cad-update', {
        fileId,
        changes,
        updatedBy: user?.id,
        updatedByName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle manufacturing updates
    socket.on('manufacturing-update', (data) => {
      const { productionOrderId, status, details } = data;
      
      logger.info('Manufacturing update', {
        userId: user?.id,
        productionOrderId,
        status,
      });

      // Broadcast to manufacturing team
      io.to('department:MANUFACTURING').emit('manufacturing-update', {
        productionOrderId,
        status,
        details,
        updatedBy: user?.id,
        updatedByName: `${user?.firstName} ${user?.lastName}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: user?.id,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });
  });

  logger.info('Socket.IO initialized successfully');
};

// Utility functions for emitting events from other parts of the application
export const emitToUser = (io: Server, userId: string, event: string, data: any): void => {
  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitToDepartment = (io: Server, department: string, event: string, data: any): void => {
  io.to(`department:${department}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitToCompany = (io: Server, companyId: string, event: string, data: any): void => {
  io.to(`company:${companyId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitToProject = (io: Server, projectId: string, event: string, data: any): void => {
  io.to(`project:${projectId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export const emitToWorkflow = (io: Server, workflowId: string, event: string, data: any): void => {
  io.to(`workflow:${workflowId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}; 