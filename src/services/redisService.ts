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
    });

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
    });

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
  private client: Redis;

  private constructor() {
    this.client = getRedisClient();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Cache set error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Set multiple cache values
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
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
      logger.error('Cache mset error', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get multiple cache values
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map(value => value ? JSON.parse(value) as T : null);
    } catch (error) {
      logger.error('Cache mget error', { keys, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Clear cache by pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error('Cache clear pattern error', { pattern, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.client.info();
      const keyspace = await this.client.info('keyspace');
      
      return {
        info: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Cache stats error', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split('\r\n');
    const result: Record<string, any> = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }
}

/**
 * Session service
 */
export class SessionService {
  private static instance: SessionService;
  private client: Redis;

  private constructor() {
    this.client = getRedisClient();
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
    try {
      const sessionData = {
        ...data,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
      };
      
      await this.client.setex(`session:${sessionId}`, ttl, JSON.stringify(sessionData));
    } catch (error) {
      logger.error('Session creation error', { sessionId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get session
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const sessionData = await this.client.get(`session:${sessionId}`);
      if (!sessionData) return null;
      
      const session = JSON.parse(sessionData);
      session.lastAccessed = new Date().toISOString();
      
      // Update last accessed time
      await this.client.setex(`session:${sessionId}`, 3600, JSON.stringify(session));
      
      return session;
    } catch (error) {
      logger.error('Session get error', { sessionId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, data: any): Promise<void> {
    try {
      const existingSession = await this.getSession(sessionId);
      if (!existingSession) {
        throw new Error('Session not found');
      }
      
      const updatedSession = {
        ...existingSession,
        ...data,
        lastAccessed: new Date().toISOString(),
      };
      
      await this.client.setex(`session:${sessionId}`, 3600, JSON.stringify(updatedSession));
    } catch (error) {
      logger.error('Session update error', { sessionId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      logger.error('Session delete error', { sessionId, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<any[]> {
    try {
      const sessionKeys = await this.client.keys('session:*');
      const sessions = [];
      
      for (const key of sessionKeys) {
        const sessionData = await this.client.get(key);
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }
      
      return sessions;
    } catch (error) {
      logger.error('Get active sessions error', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

/**
 * Pub/Sub service
 */
export class PubSubService {
  private static instance: PubSubService;
  private publisher: Redis;
  private subscriber: Redis;
  private subscriptions: Map<string, (message: any) => void> = new Map();

  private constructor() {
    this.publisher = getRedisClient();
    this.subscriber = getRedisSubscriber();
    this.setupSubscriber();
  }

  public static getInstance(): PubSubService {
    if (!PubSubService.instance) {
      PubSubService.instance = new PubSubService();
    }
    return PubSubService.instance;
  }

  private setupSubscriber(): void {
    this.subscriber.on('message', (channel, message) => {
      const callback = this.subscriptions.get(channel);
      if (callback) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          logger.error('PubSub message parsing error', { channel, message, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
    });
  }

  /**
   * Publish message
   */
  async publish(channel: string, message: any): Promise<void> {
    try {
      const serializedMessage = JSON.stringify(message);
      await this.publisher.publish(channel, serializedMessage);
    } catch (error) {
      logger.error('PubSub publish error', { channel, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      this.subscriptions.set(channel, callback);
      await this.subscriber.subscribe(channel);
    } catch (error) {
      logger.error('PubSub subscribe error', { channel, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Unsubscribe from channel
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      this.subscriptions.delete(channel);
      await this.subscriber.unsubscribe(channel);
    } catch (error) {
      logger.error('PubSub unsubscribe error', { channel, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

// Export singleton instances
export const cacheService = CacheService.getInstance();
export const sessionService = SessionService.getInstance();
export const pubSubService = PubSubService.getInstance(); 