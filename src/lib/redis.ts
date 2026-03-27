import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { _redis?: Redis | null; _redisInit?: boolean };

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  // Skip during Next.js build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });
    // Suppress unhandled error events to prevent build/runtime crashes
    client.on('error', () => {});
    return client;
  } catch {
    return null;
  }
}

function getRedis(): Redis | null {
  if (globalForRedis._redisInit) return globalForRedis._redis ?? null;
  globalForRedis._redisInit = true;
  globalForRedis._redis = createRedisClient();
  return globalForRedis._redis ?? null;
}

export const redis = getRedis();
