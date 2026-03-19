import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    return new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  } catch {
    console.warn('Redis connection failed, running without Redis');
    return null;
  }
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
