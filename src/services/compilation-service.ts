import { Queue } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { isValidFilePath } from '@/lib/constants';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';

const execFileAsync = promisify(execFile);

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
 * Local fallback compilation — runs pdflatex directly when Redis/BullMQ is unavailable.
 * Used for development and single-user deployments.
 */
async function compileLocally(
  compilationId: string,
  projectId: string,
  mainFile: string,
  compiler: string,
  files: Array<{ path: string; minioKey: string | null }>,
) {
  const tmpDir = path.join(os.tmpdir(), `paperforge-compile-${compilationId}`);
  await fs.promises.mkdir(tmpDir, { recursive: true });

  try {
    // Write all project files to temp directory
    for (const file of files) {
      const filePath = path.join(tmpDir, file.path);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(tmpDir) + path.sep)) continue;

      await fs.promises.mkdir(path.dirname(resolved), { recursive: true });

      if (file.minioKey) {
        try {
          const stream = await minioClient.getObject(getBucket(), file.minioKey);
          const chunks: Buffer[] = [];
          for await (const chunk of stream as AsyncIterable<Buffer>) {
            chunks.push(chunk);
          }
          await fs.promises.writeFile(resolved, Buffer.concat(chunks));
        } catch {
          // Skip files that can't be read from MinIO
        }
      }
    }

    // Check the main file exists
    const mainPath = path.join(tmpDir, mainFile);
    if (!fs.existsSync(mainPath)) {
      await prisma.compilation.update({
        where: { id: compilationId },
        data: { status: 'failed', log: `Main file "${mainFile}" not found in project files.` },
      });
      return;
    }

    // Determine the compiler command
    const compilerCmd = compiler === 'xelatex' ? 'xelatex'
      : compiler === 'lualatex' ? 'lualatex'
      : 'pdflatex';

    const startTime = Date.now();

    // Run the compiler (2 passes for references)
    let fullLog = '';
    for (let pass = 0; pass < 2; pass++) {
      try {
        const { stdout, stderr } = await execFileAsync(compilerCmd, [
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-output-directory', tmpDir,
          mainPath,
        ], {
          timeout: 60000, // 60 second timeout
          cwd: tmpDir,
          maxBuffer: 10 * 1024 * 1024, // 10MB log buffer
        });
        fullLog = stdout + (stderr ? `\n${stderr}` : '');
      } catch (err) {
        const execErr = err as { stdout?: string; stderr?: string; code?: number };
        fullLog = (execErr.stdout ?? '') + '\n' + (execErr.stderr ?? '');
        // pdflatex returns non-zero on warnings too, only fail if PDF wasn't generated
        break;
      }
    }

    const durationMs = Date.now() - startTime;

    // Check if PDF was generated
    const pdfName = mainFile.replace(/\.tex$/, '.pdf');
    const pdfPath = path.join(tmpDir, pdfName);

    if (fs.existsSync(pdfPath)) {
      // Upload PDF to MinIO
      const pdfBuffer = await fs.promises.readFile(pdfPath);
      const pdfMinioKey = `compilations/${compilationId}/output.pdf`;

      try {
        await ensureBucket();
        await minioClient.putObject(getBucket(), pdfMinioKey, pdfBuffer);
      } catch {
        // MinIO unavailable — PDF won't be downloadable but compilation still succeeds
      }

      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: 'success',
          log: fullLog.slice(0, 100000), // Cap log at 100KB
          durationMs,
          pdfMinioKey,
        },
      });
    } else {
      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: 'failed',
          log: fullLog.slice(0, 100000),
          durationMs,
        },
      });
    }
  } finally {
    // Clean up temp directory
    fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
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

  const compilation = await prisma.compilation.create({
    data: { projectId, userId, status: 'queued', compiler: project.compiler },
  });

  if (compilationQueue) {
    // Production mode: use BullMQ queue
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
  } else {
    // Local fallback: compile directly with pdflatex
    // Run asynchronously so the API responds immediately
    compileLocally(
      compilation.id,
      projectId,
      project.mainFile,
      project.compiler,
      project.files.map((f) => ({ path: f.path, minioKey: f.minioKey })),
    ).catch((err) => {
      console.error('[compilation] Local compile failed:', err);
      prisma.compilation.update({
        where: { id: compilation.id },
        data: { status: 'failed', log: err instanceof Error ? err.message : 'Local compilation failed' },
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
