import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { inviteMemberSchema } from '@/lib/validation';
import { getMembers, inviteMember } from '@/services/member-service';

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
    const body = await request.json();
    const { email, role } = inviteMemberSchema.parse(body);
    const member = await inviteMember(id, userId, email, role);
    return apiSuccess(member, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
