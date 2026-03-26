import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

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
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: { where: { deletedAt: null } } },
  });
  if (!project) throw new ApiError(404, 'Project not found');

  // Validate mainFile path (prevent directory traversal)
  if (project.mainFile.includes('..') || project.mainFile.startsWith('/')) {
    throw new ApiError(400, 'Invalid main file path');
  }

  const compilation = await prisma.compilation.create({
    data: { projectId, userId, status: 'queued', compiler: project.compiler },
  });

  if (!compilationQueue) {
    throw new ApiError(503, 'Compilation service unavailable (Redis not configured)');
  }

  await compilationQueue.add(
    'compile',
    {
      compilationId: compilation.id,
      projectId,
      mainFile: project.mainFile,
      compiler: project.compiler,
      files: project.files.map((f) => ({ path: f.path, minioKey: f.minioKey! })),
    },
    {
      priority: 2,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  return compilation;
}

export async function getCompilationStatus(compilationId: string) {
  return prisma.compilation.findUnique({
    where: { id: compilationId },
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
