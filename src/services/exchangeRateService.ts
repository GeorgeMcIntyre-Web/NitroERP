import { logger } from '../utils/logger';

export const initializeExchangeRateService = async (): Promise<void> => {
  try {
    logger.info('Exchange rate service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize exchange rate service', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}; 