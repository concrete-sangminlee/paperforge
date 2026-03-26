import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { assertProjectRole } from '@/services/project-service';
import { triggerCompilation } from '@/services/compilation-service';
import { ApiErrors } from '@/lib/api-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor']);

    // Rate limit: 10 compilations per minute per user per project
    const rateLimitKey = `rate:compile:${userId}:${id}`;
    const rateLimit = await checkRateLimit(rateLimitKey, 10, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many compilation requests. Please wait before retrying.',
          },
        },
        {
          status: 429,
          headers: rateLimitHeaders(10, rateLimit),
        },
      );
    }

    const compilation = await triggerCompilation(id, userId);
    return NextResponse.json(
      { success: true, data: compilation },
      {
        status: 202,
        headers: rateLimitHeaders(10, rateLimit),
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
