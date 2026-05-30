import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProject } from '@/services/project-service';
import { createFile } from '@/services/file-service';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { isValidFilePath, LIMITS, RATE_LIMITS } from '@/lib/constants';
import { parseZipTextEntries, ZIP_IMPORT_LIMITS } from '@/lib/zip-import';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logAuditAction } from '@/services/audit-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/projects/import
 * Import a project from a ZIP file upload.
 * Creates a new project and populates it with all text files from the ZIP.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    const limited = await enforceRateLimit(
      `rate:import:${userId}`,
      RATE_LIMITS.IMPORT,
      'You have imported too many projects recently. Please try again later.',
    );
    if (limited) return limited;

    const formData = await request.formData();
    const zipFile = formData.get('file') as File | null;
    const projectName = (formData.get('name') as string) || 'Imported Project';

    if (!zipFile) {
      return ApiErrors.notFound('No file uploaded');
    }

    if (zipFile.size > ZIP_IMPORT_LIMITS.MAX_ARCHIVE_BYTES) {
      return apiError('ZIP archive is too large.', 413, 'ARCHIVE_TOO_LARGE');
    }

    // Create the project
    const project = await createProject(userId, { name: projectName });

    // Parse ZIP and create files
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const files = parseZipTextEntries(buffer);

    let importedCount = 0;
    for (const entry of files) {
      if (!isValidFilePath(entry.path)) continue;
      if (entry.path.startsWith('__MACOSX/') || entry.path.startsWith('.')) continue;
      if (Buffer.byteLength(entry.content, 'utf8') > LIMITS.MAX_FILE_SIZE) continue;

      try {
        await createFile(project.id, entry.path, entry.content);
        importedCount++;
      } catch {
        // Skip files that fail to import (binary, too large, etc.)
      }
    }

    logAuditAction(userId, 'project.imported_zip', 'project', project.id, { projectName, importedCount }).catch(() => {});

    return apiSuccess({ project, importedFiles: importedCount }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
