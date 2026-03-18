import { prisma } from '@/lib/prisma';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { ApiError } from '@/lib/errors';
import { Readable } from 'stream';

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
  await ensureBucket();
  const bucket = getBucket();
  const minioKey = `projects/${projectId}/files/${path}`;
  const buffer = Buffer.from(content, 'utf-8');

  await minioClient.putObject(bucket, minioKey, buffer, buffer.length, {
    'Content-Type': 'text/plain',
  });

  const existing = await prisma.file.findFirst({
    where: { projectId, path },
  });

  if (existing) {
    const file = await prisma.file.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        isBinary: false,
        sizeBytes: buffer.length,
        mimeType: 'text/plain',
        minioKey,
      },
    });
    return file;
  }

  const file = await prisma.file.create({
    data: {
      projectId,
      path,
      isBinary: false,
      sizeBytes: buffer.length,
      mimeType: 'text/plain',
      minioKey,
    },
  });
  return file;
}

/**
 * Reads file content from MinIO for a non-deleted File record.
 */
export async function getFileContent(projectId: string, path: string) {
  const file = await prisma.file.findFirst({
    where: { projectId, path, deletedAt: null },
  });
  if (!file) throw new ApiError(404, 'File not found');

  const bucket = getBucket();
  const stream = await minioClient.getObject(bucket, file.minioKey!);
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/**
 * Returns all non-deleted files for a project, sorted by path.
 */
export async function listFiles(projectId: string) {
  return prisma.file.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { path: 'asc' },
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
 */
export async function uploadBinaryFile(
  projectId: string,
  path: string,
  buffer: Buffer,
  mimeType: string,
) {
  await ensureBucket();
  const bucket = getBucket();
  const minioKey = `projects/${projectId}/files/${path}`;

  const stream = Readable.from(buffer);
  await minioClient.putObject(bucket, minioKey, stream, buffer.length, {
    'Content-Type': mimeType,
  });

  const existing = await prisma.file.findFirst({
    where: { projectId, path },
  });

  if (existing) {
    const file = await prisma.file.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        isBinary: true,
        sizeBytes: buffer.length,
        mimeType,
        minioKey,
      },
    });
    return file;
  }

  const file = await prisma.file.create({
    data: {
      projectId,
      path,
      isBinary: true,
      sizeBytes: buffer.length,
      mimeType,
      minioKey,
    },
  });
  return file;
}
