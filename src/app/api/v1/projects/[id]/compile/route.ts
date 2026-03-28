import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { assertProjectRole } from '@/services/project-service';
import { triggerCompilation } from '@/services/compilation-service';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';

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
      const res = apiError('Too many compilation requests. Please wait before retrying.', 429, 'RATE_LIMITED');
      Object.entries(rateLimitHeaders(10, rateLimit)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const compilation = await triggerCompilation(id, userId);
    const res = apiSuccess(compilation, 202);
    Object.entries(rateLimitHeaders(10, rateLimit)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}
