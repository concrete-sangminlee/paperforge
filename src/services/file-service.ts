import { prisma } from '@/lib/prisma';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { ApiError } from '@/lib/errors';

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

  await minioClient.putObject(bucket, minioKey, buffer);

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
        mimeType: 'text/x-tex',
      },
    });
  }

  return prisma.file.create({
    data: {
      projectId,
      path,
      isBinary: false,
      sizeBytes: BigInt(buffer.length),
      mimeType: 'text/x-tex',
      minioKey,
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
  if (!file || !file.minioKey) throw new ApiError(404, 'File not found');

  const stream = await minioClient.getObject(getBucket(), file.minioKey);
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
 */
export async function uploadBinaryFile(
  projectId: string,
  path: string,
  buffer: Buffer,
  mimeType: string,
) {
  await ensureBucket();
  const minioKey = `projects/${projectId}/files/${path}`;
  await minioClient.putObject(getBucket(), minioKey, buffer);

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
    },
  });
}
