import fs from 'fs';
import pathModule from 'path';
import { prisma } from '@/lib/prisma';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { ApiError } from '@/lib/errors';

/**
 * Local filesystem fallback for file storage when MinIO is unavailable.
 * Used for development and single-user deployments.
 */
const LOCAL_STORAGE = pathModule.join(process.env.LOCAL_STORAGE_PATH || (process.cwd() + '/.local-storage'));

function localPath(minioKey: string): string {
  const resolved = pathModule.resolve(LOCAL_STORAGE, minioKey);
  if (!resolved.startsWith(pathModule.resolve(LOCAL_STORAGE) + pathModule.sep)) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

async function writeLocal(minioKey: string, buffer: Buffer): Promise<void> {
  const dest = localPath(minioKey);
  await fs.promises.mkdir(pathModule.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buffer);
}

async function readLocal(minioKey: string): Promise<Buffer | null> {
  try {
    return await fs.promises.readFile(localPath(minioKey));
  } catch {
    return null;
  }
}

/** Detect MIME type from file extension for text files. */
function detectTextMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tex':
    case 'ltx':
    case 'cls':
    case 'sty':
      return 'text/x-tex';
    case 'bib':
    case 'bst':
      return 'text/x-bibtex';
    case 'md':
      return 'text/markdown';
    case 'json':
      return 'application/json';
    case 'yaml':
    case 'yml':
      return 'text/yaml';
    case 'txt':
    case 'log':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

/**
 * Uploads text content to MinIO and upserts the File record.
 * Uses findFirst + create/update because the partial unique index
 * (idx_files_unique_path) is not recognised by Prisma's upsert.
 */
export async function createFile(
  projectId: string,
  path: string,
  content: string,
) {
  const minioKey = `projects/${projectId}/files/${path}`;
  const buffer = Buffer.from(content, 'utf-8');
  const mimeType = detectTextMimeType(path);

  // Try to upload to MinIO — fall back to local filesystem if unavailable
  try {
    await ensureBucket();
    const bucket = getBucket();
    await minioClient.putObject(bucket, minioKey, buffer);
  } catch {
    // MinIO not available — save to local filesystem as fallback
    await writeLocal(minioKey, buffer).catch(() => {});
  }

  const existing = await prisma.file.findFirst({
    where: { projectId, path },
  });

  if (existing) {
    return prisma.file.update({
      where: { id: existing.id },
      data: {
        sizeBytes: BigInt(buffer.length),
        minioKey,
        deletedAt: null,
        isBinary: false,
        mimeType,
        content,
      },
    });
  }

  return prisma.file.create({
    data: {
      projectId,
      path,
      isBinary: false,
      sizeBytes: BigInt(buffer.length),
      mimeType,
      minioKey,
      content,
    },
  });
}

/**
 * Reads file content from MinIO for a non-deleted File record.
 */
export async function getFileContent(projectId: string, path: string): Promise<string> {
  const file = await prisma.file.findFirst({
    where: { projectId, path, deletedAt: null },
  });
  if (!file) throw new ApiError(404, 'File not found');

  // 1. Try MinIO (production storage)
  if (file.minioKey) {
    try {
      const stream = await minioClient.getObject(getBucket(), file.minioKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks).toString('utf-8');
    } catch {
      // MinIO unavailable — try fallbacks
    }
  }

  // 2. Try DB content (works on Vercel/serverless)
  if (file.content) return file.content;

  // 3. Try local filesystem (dev fallback)
  if (file.minioKey) {
    const localBuf = await readLocal(file.minioKey);
    if (localBuf) return localBuf.toString('utf-8');
  }

  return '';
}

/**
 * Returns all non-deleted files for a project, sorted by path.
 */
export async function listFiles(projectId: string) {
  return prisma.file.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { path: 'asc' },
    select: {
      id: true,
      path: true,
      isBinary: true,
      sizeBytes: true,
      mimeType: true,
      updatedAt: true,
    },
  });
}

/**
 * Soft-deletes a file by setting deletedAt.
 */
export async function deleteFile(projectId: string, path: string) {
  const file = await prisma.file.findFirst({
    where: { projectId, path, deletedAt: null },
  });
  if (!file) throw new ApiError(404, 'File not found');

  return prisma.file.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });
}

/**
 * Uploads binary data to MinIO and upserts the File record with isBinary=true.
 * For small binary files (< 4MB), a base64-encoded copy is stored in the DB
 * content column so the file survives when MinIO is unavailable (e.g., Vercel).
 */
export async function uploadBinaryFile(
  projectId: string,
  path: string,
  buffer: Buffer,
  mimeType: string,
) {
  const minioKey = `projects/${projectId}/files/${path}`;

  // Try to upload to MinIO — skip gracefully if unavailable (e.g., Vercel)
  let minioAvailable = false;
  try {
    await ensureBucket();
    await minioClient.putObject(getBucket(), minioKey, buffer);
    minioAvailable = true;
  } catch {
    // MinIO not available — fall back to local storage then DB
    await writeLocal(minioKey, buffer).catch(() => {});
  }

  // Store base64 in DB content column for small binaries when MinIO is unavailable
  const dbContent = !minioAvailable && buffer.length < 4 * 1024 * 1024
    ? buffer.toString('base64')
    : undefined;

  const existing = await prisma.file.findFirst({
    where: { projectId, path },
  });

  if (existing) {
    return prisma.file.update({
      where: { id: existing.id },
      data: {
        sizeBytes: BigInt(buffer.length),
        minioKey,
        mimeType,
        isBinary: true,
        deletedAt: null,
        ...(dbContent !== undefined ? { content: dbContent } : {}),
      },
    });
  }

  return prisma.file.create({
    data: {
      projectId,
      path,
      isBinary: true,
      sizeBytes: BigInt(buffer.length),
      mimeType,
      minioKey,
      ...(dbContent !== undefined ? { content: dbContent } : {}),
    },
  });
}
