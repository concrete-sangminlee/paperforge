import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import {
  getFileContent,
  createFile,
  deleteFile,
} from '@/services/file-service';
import { isValidFilePath, LIMITS } from '@/lib/constants';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

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
    if (!isValidFilePath(filePath)) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }
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

    // Rate limit: 30 file writes per minute per user
    const rl = await checkRateLimit(`rate:file-write:${userId}`, 30, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many file operations. Please slow down.' },
        { status: 429, headers: rateLimitHeaders(30, rl) },
      );
    }

    const filePath = path.join('/');
    if (!isValidFilePath(filePath)) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }

    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';

    // Enforce content size limit
    if (content.length > LIMITS.MAX_FILE_SIZE) {
      return apiError(
        `Content too large. Maximum size is ${LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        413,
        'CONTENT_TOO_LARGE',
      );
    }

    const file = await createFile(id, filePath, content);
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
    if (!isValidFilePath(filePath)) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }

    await deleteFile(id, filePath);
    return apiSuccess({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
