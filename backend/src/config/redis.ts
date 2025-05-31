import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

// Redis configuration
const redisConfig = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  password: process.env['REDIS_PASSWORD'] || undefined,
  db: 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client
export const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    connectTimeout: redisConfig.connectTimeout,
  },
  ...(redisConfig.password && { password: redisConfig.password }),
  database: redisConfig.db,
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info(`Redis connected successfully at ${redisConfig.host}:${redisConfig.port}`);
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis ping successful');
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    throw error;
  }
};

// Graceful shutdown
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redisClient.disconnect();
    logger.info('Redis client disconnected.');
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
  }
};

// Handle Redis events
redisClient.on('connect', () => {
  logger.debug('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis client is ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('end', () => {
  logger.info('Redis client connection ended');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

// Helper functions for common Redis operations
export const redisHelpers = {
  // Set key with TTL
  setWithTTL: async (key: string, value: string, ttlSeconds: number): Promise<void> => {
    await redisClient.setEx(key, ttlSeconds, value);
  },

  // Get key
  get: async (key: string): Promise<string | null> => {
    return await redisClient.get(key);
  },

  // Delete key
  delete: async (key: string): Promise<number> => {
    return await redisClient.del(key);
  },

  // Set JSON with TTL
  setJSON: async (key: string, value: any, ttlSeconds?: number): Promise<void> => {
    const jsonString = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, jsonString);
    } else {
      await redisClient.set(key, jsonString);
    }
  },

  // Get JSON
  getJSON: async (key: string): Promise<any | null> => {
    const value = await redisClient.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Error parsing JSON from Redis key ${key}:`, error);
      return null;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    const result = await redisClient.exists(key);
    return result === 1;
  },

  // Set with expiration time
  expire: async (key: string, ttlSeconds: number): Promise<boolean> => {
    const result = await redisClient.expire(key, ttlSeconds);
    return Boolean(result);
  },

  // Get TTL
  getTTL: async (key: string): Promise<number> => {
    return await redisClient.ttl(key);
  },

  // Flush all data (development only)
  flushAll: async (): Promise<void> => {
    if (process.env['NODE_ENV'] === 'development') {
      await redisClient.flushAll();
      logger.warn('Redis: All data flushed');
    } else {
      logger.error('Redis flush attempted in non-development environment');
    }
  },
};

export default redisClient; 