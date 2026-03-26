import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { restoreVersion } from '@/services/version-service';

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id, versionId } = await params;

    // Only owners and editors can restore versions
    await assertProjectRole(id, userId, ['owner', 'editor']);

    const version = await restoreVersion(id, versionId);
    return apiSuccess(version);
  } catch (error) {
    return errorResponse(error);
  }
}
