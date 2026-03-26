import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { deleteGitCredential } from '@/services/git-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

type RouteParams = { params: Promise<{ credentialId: string }> };

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { credentialId } = await params;

    await deleteGitCredential(credentialId, userId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
