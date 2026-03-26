import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { updateProjectSchema } from '@/lib/validation';
import {
  getProject,
  updateProject,
  deleteProject,
} from '@/services/project-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const project = await getProject(id, userId);
    return apiSuccess(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const data = updateProjectSchema.parse(body);
    const project = await updateProject(id, userId, data);
    return apiSuccess(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    await deleteProject(id, userId);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
