import { randomUUID } from 'crypto';
import { redis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

/**
 * Atomic Lua script for sliding-window rate limiting.
 * Runs entirely on the Redis server so concurrent requests are serialized.
 */
const LUA_RATE_LIMIT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local windowMs = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local member = ARGV[4]

  redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
  local count = redis.call('ZCARD', key)

  if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(windowMs / 1000))
    return limit - count - 1
  else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    if oldest and #oldest >= 2 then
      return -(tonumber(oldest[2]) + windowMs - now)
    end
    return -1
  end
`;

/**
 * Redis sorted-set sliding window rate limiter.
 *
 * Uses an atomic Lua script to prevent TOCTOU race conditions
 * where concurrent requests could bypass the limit.
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
  if (!redis) {
    console.warn(`[rate-limit] Redis unavailable — rate limiting disabled for key: ${key}`);
    return { allowed: true, remaining: limit };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const member = `${now}:${randomUUID()}`;

  const result = await redis.eval(
    LUA_RATE_LIMIT, 1, key,
    String(limit), String(windowMs), String(now), member,
  ) as number;

  if (result < 0) {
    const retryAfterMs = Math.abs(result);
    const retryAfter = Math.max(Math.ceil(retryAfterMs / 1000), 1);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: result };
}

/**
 * Generate standard rate limit headers for HTTP responses.
 */
export function rateLimitHeaders(
  limit: number,
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
  };
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
    headers['X-RateLimit-Reset'] = String(
      Math.ceil(Date.now() / 1000) + result.retryAfter,
    );
  }
  return headers;
}
