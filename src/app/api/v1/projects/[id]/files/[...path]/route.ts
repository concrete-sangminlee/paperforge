import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import {
  getFileContent,
  createFile,
  deleteFile,
} from '@/services/file-service';

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);
    const filePath = path.join('/');
    const content = await getFileContent(id, filePath);
    return apiSuccess({ content });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);
    const filePath = path.join('/');
    const body = await request.json();
    const file = await createFile(id, filePath, body.content);
    return apiSuccess({ file });
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
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);
    const filePath = path.join('/');
    await deleteFile(id, filePath);
    return apiSuccess({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
