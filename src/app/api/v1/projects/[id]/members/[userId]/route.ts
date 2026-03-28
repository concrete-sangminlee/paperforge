import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { updateMemberRole, removeMember } from '@/services/member-service';

type RouteParams = { params: Promise<{ id: string; userId: string }> };

const updateRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const requesterId = (session.user as { id: string }).id;
    const { id, userId } = await params;
    const body = await request.json();
    const { role } = updateRoleSchema.parse(body);
    const member = await updateMemberRole(id, requesterId, userId, role);
    return apiSuccess(member);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const requesterId = (session.user as { id: string }).id;
    const { id, userId } = await params;
    await removeMember(id, requesterId, userId);
    return apiSuccess({ removed: true });
  } catch (error) {
    return errorResponse(error);
  }
}
