import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { pushToRemote } from '@/services/git-service';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor']);

    await pushToRemote(id, userId);
    return apiSuccess({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
