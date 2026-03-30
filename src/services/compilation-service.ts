import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { isValidFilePath } from '@/lib/constants';

let compilationQueue: Queue | null = null;
try {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    compilationQueue = new Queue('compilation', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        maxRetriesPerRequest: null,
      },
    });
  }
} catch {
  console.warn('BullMQ queue unavailable (no Redis)');
}

export async function triggerCompilation(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { files: { where: { deletedAt: null } } },
  });
  if (!project) throw new ApiError(404, 'Project not found');

  // Validate mainFile path (prevent directory traversal)
  if (!isValidFilePath(project.mainFile)) {
    throw new ApiError(400, 'Invalid main file path');
  }

  // Check queue BEFORE creating a DB record to avoid orphaned 'queued' entries
  if (!compilationQueue) {
    throw new ApiError(503, 'Compilation service unavailable (Redis not configured)');
  }

  const compilation = await prisma.compilation.create({
    data: { projectId, userId, status: 'queued', compiler: project.compiler },
  });

  await compilationQueue.add(
    'compile',
    {
      compilationId: compilation.id,
      projectId,
      mainFile: project.mainFile,
      compiler: project.compiler,
      files: project.files.filter((f) => f.minioKey).map((f) => ({ path: f.path, minioKey: f.minioKey as string })),
    },
    {
      priority: 2,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  return compilation;
}

export async function getCompilationStatus(compilationId: string, projectId?: string) {
  return prisma.compilation.findFirst({
    where: { id: compilationId, ...(projectId ? { projectId } : {}) },
    select: {
      id: true,
      status: true,
      log: true,
      durationMs: true,
      createdAt: true,
      docxMinioKey: true,
    },
  });
}

export async function getLatestCompilation(projectId: string) {
  return prisma.compilation.findFirst({
    where: { projectId, status: 'success' },
    orderBy: { createdAt: 'desc' },
  });
}
