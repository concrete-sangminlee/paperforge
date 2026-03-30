import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { isValidFilePath } from '@/lib/constants';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { getFileContent } from '@/services/file-service';

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

/**
 * Serverless-compatible compilation using latex.ytotech.com API.
 * No local pdflatex installation required — works on Vercel.
 */
async function compileViaAPI(
  compilationId: string,
  projectId: string,
  mainFile: string,
  compiler: string,
  files: Array<{ path: string }>,
) {
  const startTime = Date.now();

  try {
    // Collect all file contents from DB/MinIO
    const resources: Array<{ main: boolean; path: string; content: string }> = [];

    for (const file of files) {
      try {
        const content = await getFileContent(projectId, file.path);
        resources.push({
          main: file.path === mainFile,
          path: file.path,
          content: content || '',
        });
      } catch {
        // Skip files that can't be read
      }
    }

    // Check main file exists
    const mainResource = resources.find((r) => r.main);
    if (!mainResource || !mainResource.content) {
      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: 'failed',
          log: `Main file "${mainFile}" not found or empty. Make sure to save (Ctrl+S) before compiling.`,
        },
      });
      return;
    }

    // Build the API request for latex.ytotech.com
    const apiResources = resources.map((r) => ({
      path: r.path,
      content: r.content,
    }));

    const apiBody = {
      compiler: compiler === 'xelatex' ? 'xelatex' : compiler === 'lualatex' ? 'lualatex' : 'pdflatex',
      resources: apiResources,
    };

    const response = await fetch('https://latex.ytotech.com/builds/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiBody),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    const durationMs = Date.now() - startTime;

    if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
      // Success — got PDF back
      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      const pdfMinioKey = `compilations/${compilationId}/output.pdf`;

      // Try to store in MinIO; fall back to DB storage
      let minioOk = false;
      try {
        await ensureBucket();
        await minioClient.putObject(getBucket(), pdfMinioKey, pdfBuffer);
        minioOk = true;
      } catch {
        // MinIO unavailable — will store in DB
      }

      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: 'success',
          log: `Compilation successful (${(durationMs / 1000).toFixed(1)}s via LaTeX API)`,
          durationMs,
          pdfMinioKey: minioOk ? pdfMinioKey : null,
          pdfData: minioOk ? null : pdfBuffer,
        },
      });
    } else {
      // Error — got error response
      const errorText = await response.text().catch(() => 'Unknown compilation error');
      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: 'failed',
          log: errorText.slice(0, 100000),
          durationMs,
        },
      });
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Compilation failed';
    await prisma.compilation.update({
      where: { id: compilationId },
      data: {
        status: 'failed',
        log: `Error: ${message}`,
        durationMs,
      },
    });
  }
}

export async function triggerCompilation(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { files: { where: { deletedAt: null } } },
  });
  if (!project) throw new ApiError(404, 'Project not found');

  if (!isValidFilePath(project.mainFile)) {
    throw new ApiError(400, 'Invalid main file path');
  }

  const compilation = await prisma.compilation.create({
    data: { projectId, userId, status: 'queued', compiler: project.compiler },
  });

  if (compilationQueue) {
    // Production mode with Redis: use BullMQ queue
    await compilationQueue.add(
      'compile',
      {
        compilationId: compilation.id,
        projectId,
        mainFile: project.mainFile,
        compiler: project.compiler,
        files: project.files.filter((f) => f.minioKey).map((f) => ({ path: f.path, minioKey: f.minioKey as string })),
      },
      { priority: 2, attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
  } else {
    // Serverless fallback: compile via external API
    compileViaAPI(
      compilation.id,
      projectId,
      project.mainFile,
      project.compiler,
      project.files.map((f) => ({ path: f.path })),
    ).catch((err) => {
      console.error('[compilation] API compile failed:', err);
      prisma.compilation.update({
        where: { id: compilation.id },
        data: { status: 'failed', log: err instanceof Error ? err.message : 'Compilation failed' },
      }).catch(() => {});
    });
  }

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
