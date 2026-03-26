import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { uploadBinaryFile } from '@/services/file-service';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { BLOCKED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);

    const formData = await request.formData();
    const uploaded = formData.get('file');
    if (!uploaded || !(uploaded instanceof File)) {
      return apiError('No file provided', 400, 'MISSING_FILE');
    }

    const filePath =
      (formData.get('path') as string | null) || uploaded.name;
    const mimeType = uploaded.type || 'application/octet-stream';

    // Validate file path (prevent directory traversal)
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return apiError('Invalid file path', 400, 'INVALID_PATH');
    }

    // Validate file size
    if (uploaded.size > MAX_FILE_SIZE) {
      return apiError(
        `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        413,
        'FILE_TOO_LARGE',
      );
    }

    // Validate file extension
    const ext = '.' + filePath.split('.').pop()?.toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return apiError(
        `File type ${ext} is not allowed`,
        415,
        'BLOCKED_FILE_TYPE',
      );
    }

    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const file = await uploadBinaryFile(id, filePath, buffer, mimeType);
    return apiSuccess({ file }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
