import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { joinViaShareLink } from '@/services/member-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ token: string }> };

/**
 * POST /api/v1/join/[token]
 * Adds the authenticated user to the project the share link points at.
 * POST (not GET) so that the join action is not triggerable as a side-effect
 * of cross-origin `<img>`/`<script>` loads pointed at a leaked token URL.
 * The user-facing `/join/[token]` page wraps this with a confirmation step.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { token } = await params;
    const project = await joinViaShareLink(token, userId);
    return apiSuccess(project);
  } catch (error) {
    return errorResponse(error);
  }
}
