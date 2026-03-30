import { NextResponse } from 'next/server';

type CheckStatus = { status: 'ok' | 'error' | 'skipped'; latency?: number; message?: string };

export async function GET() {
  const checks: Record<string, CheckStatus> = {};
  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

  // Check database (required service — only this can degrade the overall status)
  try {
    const start = Date.now();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch {
    checks.database = { status: 'error', message: 'Database unreachable' };
    overallStatus = 'degraded';
  }

  // Check Redis (optional — app works with in-memory fallback)
  const redisConfigured = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (redisConfigured) {
    try {
      const start = Date.now();
      const mod = await import('@/lib/redis');
      if (!mod.redis) throw new Error('Redis not configured');
      await mod.redis.ping();
      checks.redis = { status: 'ok', latency: Date.now() - start };
    } catch {
      checks.redis = { status: 'skipped', message: 'Redis unavailable (using in-memory fallback)' };
    }
  } else {
    checks.redis = { status: 'skipped', message: 'Redis not configured' };
  }

  // Check MinIO (optional — app stores content in DB as fallback)
  const minioEndpoint = process.env.MINIO_ENDPOINT || '';
  const minioConfigured = !!minioEndpoint && minioEndpoint !== 'localhost';
  if (minioConfigured) {
    try {
      const start = Date.now();
      const mod = await import('@/lib/minio');
      if (!mod.minioClient) throw new Error('MinIO not configured');
      await mod.minioClient.listBuckets();
      checks.storage = { status: 'ok', latency: Date.now() - start };
    } catch {
      checks.storage = { status: 'skipped', message: 'Storage unavailable (using DB fallback)' };
    }
  } else {
    checks.storage = { status: 'skipped', message: 'External storage not configured' };
  }

  // Only mark as down if the database (the only required service) is unreachable
  if (checks.database.status === 'error') {
    overallStatus = 'down';
  }

  // Public response: only expose status, no latencies or infrastructure details
  const publicHealth = {
    status: overallStatus,
    version: process.env.npm_package_version || '18.5.0',
    timestamp: new Date().toISOString(),
    checks: Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [k, { status: v.status }])
    ),
  };

  return NextResponse.json(publicHealth, {
    status: overallStatus === 'down' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
