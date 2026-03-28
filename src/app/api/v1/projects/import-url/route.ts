import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProject } from '@/services/project-service';
import { createFile } from '@/services/file-service';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { isValidFilePath } from '@/lib/constants';

const importUrlSchema = z.object({
  url: z.string().url().refine(
    (u) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(u),
    'Only GitHub repository URLs are supported',
  ),
  name: z.string().min(1).max(255).optional(),
});

/**
 * POST /api/v1/projects/import-url
 * Import a project from a GitHub repository URL.
 * Downloads the repo as a ZIP and extracts all text files.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    const body = await request.json();
    const { url, name } = importUrlSchema.parse(body);

    // Parse GitHub URL: https://github.com/owner/repo[/tree/branch]
    const match = url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+))?(?:\/|$)/);
    if (!match) return apiError('Invalid GitHub URL', 400);

    const [, owner, repo, branch = 'main'] = match;
    const repoName = repo.replace(/\.git$/, '');
    const projectName = name || repoName;

    // Download ZIP from GitHub
    const zipUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${branch}.zip`;
    const zipRes = await fetch(zipUrl);
    if (!zipRes.ok) {
      // Try 'master' branch as fallback
      const fallbackRes = await fetch(`https://github.com/${owner}/${repoName}/archive/refs/heads/master.zip`);
      if (!fallbackRes.ok) {
        return apiError('Could not download repository. Ensure it is public and the URL is correct.', 400);
      }
      const fallbackBuffer = Buffer.from(await fallbackRes.arrayBuffer());
      return await importFromZipBuffer(userId, projectName, fallbackBuffer, `${repoName}-master/`);
    }

    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
    return await importFromZipBuffer(userId, projectName, zipBuffer, `${repoName}-${branch}/`);
  } catch (error) {
    return errorResponse(error);
  }
}

async function importFromZipBuffer(userId: string, projectName: string, buffer: Buffer, stripPrefix: string) {
  const project = await createProject(userId, { name: projectName });
  const entries = parseZipEntries(buffer);

  let importedCount = 0;
  for (const entry of entries) {
    // Strip the GitHub archive prefix (e.g., "repo-main/")
    const path = entry.path.startsWith(stripPrefix)
      ? entry.path.slice(stripPrefix.length)
      : entry.path;

    if (!path || !isValidFilePath(path)) continue;
    if (path.startsWith('.') || path.includes('__MACOSX')) continue;

    try {
      await createFile(project.id, path, entry.content);
      importedCount++;
    } catch {
      // Skip files that fail
    }
  }

  return apiSuccess({ project, importedFiles: importedCount }, 201);
}

/** Simple ZIP parser — extracts text file entries. */
function parseZipEntries(buffer: Buffer): Array<{ path: string; content: string }> {
  const entries: Array<{ path: string; content: string }> = [];

  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) return entries;

  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
  const cdEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = cdOffset;

  for (let i = 0; i < cdEntries && offset < buffer.length; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const compression = buffer.readUInt16LE(offset + 10);
    const path = buffer.toString('utf-8', offset + 46, offset + 46 + nameLength);

    if (compression === 0 && uncompressedSize > 0 && !path.endsWith('/')) {
      const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      if (dataStart + uncompressedSize <= buffer.length) {
        try {
          const content = buffer.toString('utf-8', dataStart, dataStart + uncompressedSize);
          if (!content.includes('\0')) entries.push({ path, content });
        } catch { /* skip */ }
      }
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
