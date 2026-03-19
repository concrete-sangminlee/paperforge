import { redis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Redis sorted-set sliding window rate limiter.
 *
 * Each request adds a member to a sorted set keyed by `key`.
 * The score is the current timestamp in milliseconds.
 * Old entries outside the window are pruned on each check.
 *
 * @param key - Unique identifier for the rate limit (e.g. "rate:login:192.168.1.1")
 * @param limit - Maximum number of requests allowed in the window
 * @param windowSeconds - Duration of the sliding window in seconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  // If Redis is not available, allow all requests
  if (!redis) {
    return { allowed: true, remaining: limit };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  // Use a pipeline for atomicity
  const pipeline = redis.pipeline();

  // Remove entries outside the sliding window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Count current entries in the window
  pipeline.zcard(key);

  // Add the current request
  pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);

  // Set expiry on the key so it auto-cleans
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();

  // zcard result is at index 1
  const currentCount = (results?.[1]?.[1] as number) || 0;

  if (currentCount >= limit) {
    // Get the oldest entry to calculate retry-after
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
    const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(retryAfter, 1),
    };
  }

  return {
    allowed: true,
    remaining: limit - currentCount - 1,
  };
}
