import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifySignedToken } from '@/lib/jwt-utils';
import { prisma } from '@/lib/prisma';
import { errorResponse, ApiError } from '@/lib/errors';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';
import { RATE_LIMITS } from '@/lib/constants';
import { logAuditAction } from '@/services/audit-service';
import { getAppBaseUrl } from '@/lib/app-url';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const headersList = await headers();
    const ip = getClientIp(headersList as unknown as Headers);
    const rateLimit = await checkRateLimit(
      `rate:verify-email:${ip}`,
      RATE_LIMITS.VERIFY_EMAIL.limit,
      RATE_LIMITS.VERIFY_EMAIL.windowSeconds,
    );
    if (!rateLimit.allowed) {
      return apiError('Too many verification attempts. Please try again later.', 429, 'RATE_LIMITED', {
        ...rateLimitHeaders(RATE_LIMITS.VERIFY_EMAIL.limit, rateLimit),
      });
    }

    const { token } = await params;
    const payload = verifySignedToken(token);

    if (payload.purpose !== 'email-verify') {
      throw new ApiError(400, 'Invalid token purpose');
    }

    const userId = payload.sub as string;
    if (!userId) {
      throw new ApiError(400, 'Invalid token');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    logAuditAction(userId, 'email_verified', 'user', userId).catch(() => {});

    const baseUrl = getAppBaseUrl();
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    return errorResponse(error);
  }
}
