import { logger } from '../utils/logger';

export const initializeWorkflowEngine = async (): Promise<void> => {
  try {
    logger.info('Workflow engine initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize workflow engine', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}; 