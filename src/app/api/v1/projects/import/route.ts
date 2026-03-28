import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProject } from '@/services/project-service';
import { createFile } from '@/services/file-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { isValidFilePath, LIMITS } from '@/lib/constants';

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

    const formData = await request.formData();
    const zipFile = formData.get('file') as File | null;
    const projectName = (formData.get('name') as string) || 'Imported Project';

    if (!zipFile) {
      return ApiErrors.notFound('No file uploaded');
    }

    if (zipFile.size > LIMITS.MAX_PROJECT_SIZE) {
      return ApiErrors.internal();
    }

    // Create the project
    const project = await createProject(userId, { name: projectName });

    // Parse ZIP and create files
    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const files = parseZipEntries(buffer);

    let importedCount = 0;
    for (const entry of files) {
      if (!isValidFilePath(entry.path)) continue;
      if (entry.path.startsWith('__MACOSX/') || entry.path.startsWith('.')) continue;
      if (entry.content.length > LIMITS.MAX_FILE_SIZE) continue;

      try {
        await createFile(project.id, entry.path, entry.content);
        importedCount++;
      } catch {
        // Skip files that fail to import (binary, too large, etc.)
      }
    }

    return apiSuccess({ project, importedFiles: importedCount }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Simple ZIP parser — extracts text file entries from a ZIP buffer. */
function parseZipEntries(buffer: Buffer): Array<{ path: string; content: string }> {
  const entries: Array<{ path: string; content: string }> = [];

  // Find End of Central Directory
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return entries;

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdEntries = buffer.readUInt16LE(eocdOffset + 10);

  let offset = cdOffset;
  for (let i = 0; i < cdEntries && offset < buffer.length; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const compression = buffer.readUInt16LE(offset + 10);

    const path = buffer.toString('utf-8', offset + 46, offset + 46 + nameLength);

    // Only extract stored (uncompressed) text files
    if (compression === 0 && uncompressedSize > 0 && !path.endsWith('/')) {
      const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd <= buffer.length) {
        try {
          const content = buffer.toString('utf-8', dataStart, dataEnd);
          // Verify it's actual text (not binary masquerading as stored)
          if (!content.includes('\0')) {
            entries.push({ path, content });
          }
        } catch {
          // Skip binary/corrupted entries
        }
      }
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
