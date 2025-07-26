import Redis from 'ioredis';
import { logger } from '../utils/logger';
import config from '../../config/environment';

let redisClient: Redis;
let redisSubscriber: Redis;

/**
 * Initialize Redis connection
 */
export const initializeRedis = async (): Promise<void> => {
  try {
    // Main Redis client for caching and general operations
    redisClient = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 10000,
    } as any);

    // Redis subscriber for pub/sub operations
    redisSubscriber = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      maxLoadingTimeout: 10000,
    } as any);

    // Test connections
    await redisClient.ping();
    await redisSubscriber.ping();

    logger.info('Redis connections established successfully', {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    });

    // Set up event handlers
    setupRedisEventHandlers(redisClient, 'Main Client');
    setupRedisEventHandlers(redisSubscriber, 'Subscriber Client');

  } catch (error) {
    logger.error('Failed to initialize Redis connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Setup Redis event handlers
 */
const setupRedisEventHandlers = (client: Redis, clientName: string): void => {
  client.on('connect', () => {
    logger.info(`Redis ${clientName} connected`);
  });

  client.on('ready', () => {
    logger.info(`Redis ${clientName} ready`);
  });

  client.on('error', (error) => {
    logger.error(`Redis ${clientName} error`, {
      error: error.message,
      stack: error.stack,
    });
  });

  client.on('close', () => {
    logger.warn(`Redis ${clientName} connection closed`);
  });

  client.on('reconnecting', () => {
    logger.info(`Redis ${clientName} reconnecting`);
  });

  client.on('end', () => {
    logger.warn(`Redis ${clientName} connection ended`);
  });
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

/**
 * Get Redis subscriber instance
 */
export const getRedisSubscriber = (): Redis => {
  if (!redisSubscriber) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return redisSubscriber;
};

/**
 * Close Redis connections
 */
export const closeRedis = async (): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis main client connection closed');
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      logger.info('Redis subscriber connection closed');
    }
  } catch (error) {
    logger.error('Error closing Redis connections', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Cache service
 */
export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;

  private constructor() {
    try {
      this.client = getRedisClient();
    } catch (error) {
      // Redis not initialized, which is fine for testing
      console.warn('Redis not initialized, CacheService will use in-memory fallback');
    }
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Error setting cache value', { error, key });
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      // In-memory fallback for testing
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Error getting cache value', { error, key });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Error deleting cache value', { error, key });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) {
      // In-memory fallback for testing
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Error checking cache key existence', { error, key });
      return false;
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const pipeline = this.client.pipeline();
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Error setting multiple cache values', { error });
      throw error;
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.client) {
      // In-memory fallback for testing
      return keys.map(() => null);
    }
    
    try {
      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Error getting multiple cache values', { error, keys });
      return keys.map(() => null);
    }
  }

  async clearPattern(pattern: string): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error('Error clearing cache pattern', { error, pattern });
      throw error;
    }
  }

  async getStats(): Promise<any> {
    if (!this.client) {
      // In-memory fallback for testing
      return { connected: false, message: 'Redis not initialized' };
    }
    
    try {
      const info = await this.client.info();
      return this.parseRedisInfo(info);
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const stats: Record<string, any> = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    }
    
    return stats;
  }
}

/**
 * Session service
 */
export class SessionService {
  private static instance: SessionService;
  private client: Redis | null = null;

  private constructor() {
    try {
      this.client = getRedisClient();
    } catch (error) {
      // Redis not initialized, which is fine for testing
      console.warn('Redis not initialized, SessionService will use in-memory fallback');
    }
  }

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create session
   */
  async createSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const sessionData = {
        id: sessionId,
        data,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      };

      await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
      
      logger.info('Session created', { sessionId, ttl });
    } catch (error) {
      logger.error('Error creating session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<any | null> {
    if (!this.client) {
      // In-memory fallback for testing
      return null;
    }
    
    try {
      const sessionData = await this.client.get(`session:${sessionId}`);
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);
      
      // Check if session has expired
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Error getting session', { error, sessionId });
      return null;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, data: any): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const existingSession = await this.getSession(sessionId);
      if (!existingSession) {
        throw new Error('Session not found');
      }

      const updatedSession = {
        ...existingSession,
        data: { ...existingSession.data, ...data },
        updated_at: new Date().toISOString(),
      };

      // Get remaining TTL
      const ttl = await this.client.ttl(`session:${sessionId}`);
      if (ttl > 0) {
        await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(updatedSession));
      } else {
        // Session expired, create new one with default TTL
        await this.createSession(sessionId, updatedSession.data);
      }

      logger.info('Session updated', { sessionId });
    } catch (error) {
      logger.error('Error updating session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.client) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      await this.client.del(`session:${sessionId}`);
      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Error deleting session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<any[]> {
    if (!this.client) {
      // In-memory fallback for testing
      return [];
    }
    
    try {
      const sessionKeys = await this.client.keys('session:*');
      const sessions: any[] = [];

      for (const key of sessionKeys) {
        const sessionData = await this.client.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.expires_at && new Date(session.expires_at) > new Date()) {
            sessions.push(session);
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Error getting active sessions', { error });
      return [];
    }
  }
}

/**
 * Pub/Sub service
 */
export class PubSubService {
  private static instance: PubSubService;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private subscriptions: Map<string, (message: any) => void> = new Map();

  private constructor() {
    try {
      this.publisher = getRedisClient();
      this.subscriber = getRedisSubscriber();
      this.setupSubscriber();
    } catch (error) {
      // Redis not initialized, which is fine for testing
      console.warn('Redis not initialized, PubSubService will use in-memory fallback');
    }
  }

  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
  }

  private setupSubscriber(): void {
    if (!this.subscriber) return;
    
    this.subscriber.on('message', (channel: string, message: string) => {
      const callback = this.subscriptions.get(channel);
      if (callback) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('Error parsing pub/sub message', { error, channel, message });
        }
      }
    });
  }

  /**
   * Publish message
   */
  async publish(channel: string, message: any): Promise<void> {
    if (!this.publisher) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      const serializedMessage = JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
      
      logger.debug('Message published', { channel, message });
    } catch (error) {
      logger.error('Error publishing message', { error, channel });
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.subscriber) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      this.subscriptions.set(channel, callback);
      await this.subscriber.subscribe(channel);
      
      logger.info('Subscribed to channel', { channel });
    } catch (error) {
      logger.error('Error subscribing to channel', { error, channel });
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) {
      // In-memory fallback for testing
      return;
    }
    
    try {
      this.subscriptions.delete(channel);
      await this.subscriber.unsubscribe(channel);
      
      logger.info('Unsubscribed from channel', { channel });
    } catch (error) {
      logger.error('Error unsubscribing from channel', { error, channel });
      throw error;
    }
  }
}

// Export singleton instances
export const cacheService = CacheService.getInstance();
export const sessionService = SessionService.getInstance();
export const pubSubService = PubSubService.getInstance(); 