import { Queue } from 'bullmq';
import { prisma } from '@/lib/prisma';
import { ApiError } from '@/lib/errors';
import { LIMITS, isValidFilePath } from '@/lib/constants';
import { minioClient, getBucket, ensureBucket } from '@/lib/minio';
import { getFileContent } from '@/services/file-service';
import { env } from '@/lib/env';
import { compilationQueuePriority, getEntitledPlan } from '@/lib/entitlements';

// Cap the bytes we will ever buffer from the upstream LaTeX API. A misbehaving
// or hostile peer could otherwise send an unbounded body and OOM the serverless
// instance during arrayBuffer() / text().
const MAX_COMPILE_RESPONSE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_COMPILE_ERROR_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Read up to `maxBytes` from a fetch Response body without ever holding the
 * full payload in memory. Returns null if the cap is exceeded (caller should
 * treat as a failure) — never a partial buffer.
 */
async function readBoundedBody(res: Response, maxBytes: number): Promise<Buffer | null> {
  // content-length is a hint — short-circuit obviously-too-big responses
  // before opening the stream so honest peers fail fast.
  const declared = Number(res.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    try { await res.body?.cancel(); } catch { /* ignore */ }
    return null;
  }

  if (!res.body) {
    // No body — return empty buffer rather than null so callers can distinguish
    // "too big" (null) from "empty" (zero-length buffer).
    return Buffer.alloc(0);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.length;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      return null;
    }
    chunks.push(value);
  }
  // Copy into a fresh ArrayBuffer-backed Buffer. Allocating the ArrayBuffer
  // explicitly (not via `new Uint8Array(n).buffer`) keeps the return type as
  // Buffer<ArrayBuffer>, which is what Prisma's Bytes column accepts.
  const ab = new ArrayBuffer(total);
  const view = new Uint8Array(ab);
  let offset = 0;
  for (const chunk of chunks) {
    view.set(chunk, offset);
    offset += chunk.length;
  }
  return Buffer.from(ab);
}

let compilationQueue: Queue | null = null;

function parseRedisPort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

function parseRedisDb(pathname: string | undefined, fallback: number): number | undefined {
  if (!pathname || pathname === '/') return fallback ? 0 : undefined;
  const db = Number.parseInt(pathname.slice(1), 10);
  if (Number.isNaN(db) || db < 0 || db > 15) return fallback ? 0 : undefined;
  return db;
}

function getRedisConnectionOptions() {
  if (env.REDIS_URL) {
    const parsed = new URL(env.REDIS_URL);
    const port = parseRedisPort(parsed.port, parseRedisPort(env.REDIS_PORT, 6379));
    return {
      host: parsed.hostname,
      port,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: parseRedisDb(parsed.pathname, 0),
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: env.REDIS_HOST || 'localhost',
    port: parseRedisPort(env.REDIS_PORT, 6379),
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

try {
  if (!env.isBuildPhase && (env.REDIS_URL || env.REDIS_HOST)) {
    compilationQueue = new Queue('compilation', {
      connection: getRedisConnectionOptions(),
    });
  }
} catch {
  console.warn('BullMQ queue unavailable (no Redis)');
}

const compilationSelect = {
  id: true,
  projectId: true,
  userId: true,
  status: true,
  compiler: true,
  log: true,
  pdfMinioKey: true,
  synctexMinioKey: true,
  docxMinioKey: true,
  durationMs: true,
  createdAt: true,
} as const;

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
      // Success — got PDF back. Stream with a size cap so a hostile or buggy
      // upstream cannot OOM the instance via an unbounded response body.
      const pdfBuffer = await readBoundedBody(response, MAX_COMPILE_RESPONSE_BYTES);
      if (!pdfBuffer) {
        await prisma.compilation.update({
          where: { id: compilationId },
          data: {
            status: 'failed',
            log: `Compilation output exceeded the ${MAX_COMPILE_RESPONSE_BYTES / 1024 / 1024}MB size limit.`,
            durationMs: Date.now() - startTime,
          },
        });
        return;
      }
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
          // Prisma's Bytes column wants Uint8Array<ArrayBuffer> strictly,
          // but the bundled Node Buffer types model `.buffer` as the broader
          // ArrayBufferLike. The bytes are equivalent — narrow the type.
          pdfData: minioOk ? null : (pdfBuffer as unknown as Uint8Array<ArrayBuffer>),
        },
      });
    } else {
      // Error — got error response. Bounded read so an oversize error body
      // (e.g. HTML 502 from an intermediary) cannot blow up memory either.
      const errorBuf = await readBoundedBody(response, MAX_COMPILE_ERROR_BYTES).catch(() => null);
      const errorText = errorBuf
        ? errorBuf.toString('utf-8')
        : 'Compilation error response exceeded size limit.';
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
    include: {
      files: { where: { deletedAt: null } },
      members: {
        where: { role: 'owner' },
        select: {
          user: { select: { settings: true, storageQuotaBytes: true } },
        },
        take: 1,
      },
    },
  });
  if (!project) throw new ApiError(404, 'Project not found');

  if (!isValidFilePath(project.mainFile)) {
    throw new ApiError(400, 'Invalid main file path');
  }

  if (project.files.length > LIMITS.MAX_COMPILATION_FILES) {
    throw new ApiError(
      413,
      `Project has ${project.files.length} files; compilation is limited to ${LIMITS.MAX_COMPILATION_FILES} files.`,
      'COMPILATION_FILE_LIMIT',
    );
  }

  const compilation = await prisma.compilation.create({
    data: { projectId, userId, status: 'queued', compiler: project.compiler },
  });

  if (compilationQueue) {
    const owner = project.members[0]?.user;
    const priority = compilationQueuePriority(getEntitledPlan(owner ?? {}));

    // Production mode with Redis: use BullMQ queue
    await compilationQueue.add(
      'compile',
      {
        compilationId: compilation.id,
        projectId,
        mainFile: project.mainFile,
        compiler: project.compiler,
        files: project.files.map((f) => ({
          path: f.path,
          minioKey: f.minioKey,
          content: f.content,
          isBinary: f.isBinary,
        })),
      },
      { priority, attempts: 2, backoff: { type: 'exponential', delay: 5000 } },
    );
  } else {
    // Serverless fallback: finish the external API call before returning.
    // Fire-and-forget work can be terminated after the HTTP response on serverless hosts.
    await compileViaAPI(
      compilation.id,
      projectId,
      project.mainFile,
      project.compiler,
      project.files.map((f) => ({ path: f.path })),
    );

    return prisma.compilation.findUnique({
      where: { id: compilation.id },
      select: compilationSelect,
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
    select: {
      id: true,
      status: true,
      durationMs: true,
      createdAt: true,
      pdfMinioKey: true,
      docxMinioKey: true,
    },
  });
}
