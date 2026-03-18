import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';

const compilationQueue = new Queue('compilation', {
  connection: new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  }),
});

export async function triggerCompilation(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { files: { where: { deletedAt: null } } }, // ALL files, not just text
  });
  if (!project) throw new ApiError(404, 'Project not found');

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
    },
  });
}

export async function getLatestCompilation(projectId: string) {
  return prisma.compilation.findFirst({
    where: { projectId, status: 'success' },
    orderBy: { createdAt: 'desc' },
  });
}
