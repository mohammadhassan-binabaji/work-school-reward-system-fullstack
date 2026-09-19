import { Redis } from 'ioredis';
import RedisMock from 'ioredis-mock';
import { config } from './config.js';
import { logger } from './logger.js';

let redisClient: Redis;

const isTestEnv = config.NODE_ENV === 'test' || process.env.USE_MOCK_REDIS === 'true';

if (isTestEnv) {
  logger.info('Initializing in-memory Redis mock client for testing environment');
  redisClient = new (RedisMock as unknown as typeof Redis)();
} else {
  redisClient = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) {
        logger.error('Redis connection failed after 5 retries. Falling back or failing.');
        return null; // stop retrying
      }
      return Math.min(times * 100, 2000);
    }
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });
}

export const redis = redisClient;

export async function pingHealthCheck(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error({ error }, 'Redis ping health check failed');
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  try {
    if (typeof redis.quit === 'function') {
      await redis.quit();
    }
  } catch (err) {
    logger.warn({ err }, 'Error closing Redis connection');
  }
}
