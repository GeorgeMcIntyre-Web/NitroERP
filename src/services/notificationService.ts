import { logger } from '../utils/logger';

export const initializeNotificationService = async (): Promise<void> => {
  try {
    logger.info('Notification service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize notification service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}; 