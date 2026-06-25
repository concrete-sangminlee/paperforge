import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import {
  getFileContent,
  createFile,
  deleteFile,
} from '@/services/file-service';
import { isValidFilePath, LIMITS, RATE_LIMITS } from '@/lib/constants';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logAuditAction } from '@/services/audit-service';
import { recordActivationEvent } from '@/services/activation-service';

export const dynamic = 'force-dynamic';

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

    const limited = await enforceRateLimit(
      `rate:file-write:${userId}`,
      RATE_LIMITS.FILE_WRITE,
      'Too many file operations. Please slow down.',
    );
    if (limited) return limited;

    const filePath = path.join('/');
    if (!isValidFilePath(filePath)) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }

    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content : '';

    // Enforce the same byte limit used by storage accounting.
    if (Buffer.byteLength(content, 'utf8') > LIMITS.MAX_FILE_SIZE) {
      return apiError(
        `Content too large. Maximum size is ${LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        413,
        'CONTENT_TOO_LARGE',
      );
    }

    const file = await createFile(id, filePath, content);
    logAuditAction(userId, 'file.updated', 'project', id, { path: filePath }).catch(() => {});
    // Persisted activation marker (added source content). Fire-and-forget.
    recordActivationEvent(userId, 'added_content').catch(() => {});

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

    const limited = await enforceRateLimit(
      `rate:file-write:${userId}`,
      RATE_LIMITS.FILE_WRITE,
      'Too many file operations. Please slow down.',
    );
    if (limited) return limited;

    await assertProjectRole(id, userId, ['owner', 'editor']);

    const filePath = path.join('/');
    if (!isValidFilePath(filePath)) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }

    await deleteFile(id, filePath);
    logAuditAction(userId, 'file.deleted', 'project', id, { path: filePath }).catch(() => {});

    return apiSuccess({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
