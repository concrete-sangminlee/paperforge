import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  uptime: number;
  checks: Record<string, { status: 'ok' | 'error'; latency?: number; message?: string }>;
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus['checks'] = {};
  let overallStatus: HealthStatus['status'] = 'ok';

  // Check database
  try {
    const start = Date.now();
    const { prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch {
    checks.database = { status: 'error', message: 'Database unreachable' };
    overallStatus = 'degraded';
  }

  // Check Redis
  try {
    const start = Date.now();
    const mod = await import('@/lib/redis');
    if (!mod.redis) throw new Error('Redis not configured');
    await mod.redis.ping();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch {
    checks.redis = { status: 'error', message: 'Redis unreachable' };
    overallStatus = 'degraded';
  }

  // Check MinIO
  try {
    const start = Date.now();
    const mod = await import('@/lib/minio');
    if (!mod.minioClient) throw new Error('MinIO not configured');
    await mod.minioClient.listBuckets();
    checks.storage = { status: 'ok', latency: Date.now() - start };
  } catch {
    checks.storage = { status: 'error', message: 'Storage unreachable' };
    overallStatus = 'degraded';
  }

  // If all checks failed, mark as down
  const allFailed = Object.values(checks).every(c => c.status === 'error');
  if (allFailed) overallStatus = 'down';

  const health: HealthStatus = {
    status: overallStatus,
    version: process.env.npm_package_version || '1.9.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  return NextResponse.json(health, {
    status: overallStatus === 'down' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
