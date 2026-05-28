import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { inviteMemberSchema } from '@/lib/validation';
import { getMembers, inviteMember } from '@/services/member-service';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { logAuditAction } from '@/services/audit-service';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const members = await getMembers(id, userId);
    return apiSuccess(members);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    const rl = await checkRateLimit(
      `rate:invite:${userId}`,
      RATE_LIMITS.PROJECT_INVITE.limit,
      RATE_LIMITS.PROJECT_INVITE.windowSeconds,
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many invitations. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(RATE_LIMITS.PROJECT_INVITE.limit, rl) },
      );
    }

    const body = await request.json();
    const { email, role } = inviteMemberSchema.parse(body);
    const member = await inviteMember(id, userId, email, role);

    logAuditAction(userId, 'member.invited', 'project', id, { email, role }).catch(() => {});

    return apiSuccess(member, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
