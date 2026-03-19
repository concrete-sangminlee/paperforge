import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get queue info from Redis (if available)
    let waiting = 0, active = 0, completed = 0, failed = 0;
    if (redis) {
      [waiting, active, completed, failed] = await Promise.all([
        redis.llen('bull:compilation:wait'),
        redis.llen('bull:compilation:active'),
        redis.llen('bull:compilation:completed'),
        redis.llen('bull:compilation:failed'),
      ]);
    }

    return NextResponse.json({
      queue: {
        name: 'compilation',
        waiting,
        active,
        completed,
        failed,
      },
      workers: [
        {
          id: 'worker-1',
          status: 'running',
          note: 'Compilation worker (placeholder)',
        },
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
