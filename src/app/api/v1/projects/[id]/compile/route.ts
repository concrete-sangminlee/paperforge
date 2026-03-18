import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { assertProjectRole } from '@/services/project-service';
import { triggerCompilation } from '@/services/compilation-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    // Assert that the user has the required project role
    await assertProjectRole(id, userId, ['owner', 'editor']);

    // Rate limit: 10 compilations per minute per user per project
    const rateLimitKey = `rate:compile:${userId}:${id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many compilation requests. Please wait before retrying.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter ?? 60) },
        },
      );
    }

    const compilation = await triggerCompilation(id, userId);
    return NextResponse.json(compilation, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
