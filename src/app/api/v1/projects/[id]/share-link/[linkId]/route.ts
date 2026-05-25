import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { revokeShareLink } from '@/services/member-service';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const requesterId = (session.user as { id: string }).id;
    const { id, linkId } = await params;
    const result = await revokeShareLink(id, requesterId, linkId);
    return apiSuccess(result);
  } catch (error) {
    return errorResponse(error);
  }
}
