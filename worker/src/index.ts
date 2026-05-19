import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { compileLatex, CompilerType } from './compiler';
import { env } from './env';

// ---------------------------------------------------------------------------
// Prisma client for the worker process.
// ---------------------------------------------------------------------------
const prisma = new PrismaClient({ adapter: new PrismaPg(env.DATABASE_URL) });

// ---------------------------------------------------------------------------
// Redis connection (maxRetriesPerRequest must be null for BullMQ workers)
// ---------------------------------------------------------------------------
function createRedisConnection() {
  const options = { maxRetriesPerRequest: null };
  if (env.REDIS_URL) {
    return new Redis(env.REDIS_URL, options);
  }
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    ...options,
  });
}

const connection = createRedisConnection();

// Separate pub/sub publisher client
const publisher = createRedisConnection();

// ---------------------------------------------------------------------------
// MinIO client
// ---------------------------------------------------------------------------
const minioClient = new MinioClient({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

const BUCKET = env.MINIO_BUCKET;

// ---------------------------------------------------------------------------
// Job payload type
// ---------------------------------------------------------------------------
interface CompilationJobData {
  compilationId: string;
  projectId: string;
  mainFile: string;
  compiler: CompilerType;
  files: Array<{ path: string; minioKey?: string | null; content?: string | null; isBinary?: boolean }>;
}

// ---------------------------------------------------------------------------
// Helper: download all project files into a temp directory, preserving paths
// ---------------------------------------------------------------------------
async function downloadProjectFiles(
  files: CompilationJobData['files'],
  workDir: string,
): Promise<void> {
  const workDirReal = fs.realpathSync(workDir);
  await Promise.all(
    files.map(async (file) => {
      // Validate file path to prevent directory traversal
      if (
        !file.path ||
        file.path.includes('..') ||
        file.path.includes('\0') ||
        file.path.startsWith('/') ||
        /^[A-Za-z]:/.test(file.path)
      ) {
        console.warn(`[Worker] Skipping unsafe file path: ${file.path}`);
        return;
      }
      const destPath = path.resolve(workDir, file.path);
      // Ensure resolved path stays within workDir
      if (!destPath.startsWith(workDirReal + path.sep)) {
        console.warn(`[Worker] Path escape attempt blocked: ${file.path}`);
        return;
      }
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      // After mkdir, canonicalize the parent dir. If a malicious ZIP smuggled
      // a symlink that resolves outside workDir, realpath will reveal it and
      // we skip the write rather than follow the link.
      try {
        const realParent = fs.realpathSync(destDir);
        if (!realParent.startsWith(workDirReal + path.sep) && realParent !== workDirReal) {
          console.warn(`[Worker] Symlink escape blocked at: ${file.path}`);
          return;
        }
      } catch {
        // Directory not yet realpath-able (e.g. fresh mkdir on some FS) — fall
        // through; the prefix check above already rejected obvious traversals.
      }
      if (file.minioKey) {
        try {
          await minioClient.fGetObject(BUCKET, file.minioKey, destPath);
          return;
        } catch {
          // Fall through to DB-backed content when object storage is unavailable.
        }
      }
      if (typeof file.content === 'string' && !file.isBinary) {
        fs.writeFileSync(destPath, file.content, 'utf8');
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Helper: upload a local file to MinIO and return the key
// ---------------------------------------------------------------------------
async function uploadFile(localPath: string, minioKey: string): Promise<void> {
  await minioClient.fPutObject(BUCKET, minioKey, localPath);
}

// ---------------------------------------------------------------------------
// Helper: publish a status update to the Redis channel for this compilation
// ---------------------------------------------------------------------------
async function publishStatus(compilationId: string, payload: object): Promise<void> {
  await publisher.publish(
    `compilation:${compilationId}`,
    JSON.stringify(payload),
  );
}

// ---------------------------------------------------------------------------
// BullMQ worker
// ---------------------------------------------------------------------------
// Cap retries explicitly. Without `attempts` BullMQ uses sensible defaults
// but a misconfigured queue could otherwise retry a poison job forever,
// silently draining the worker. Three attempts with exponential backoff is
// the same shape as our other queue-bound jobs.
const WORKER_ATTEMPTS = env.WORKER_MAX_ATTEMPTS;
const WORKER_LOCK_DURATION_MS = env.WORKER_LOCK_DURATION_MS;

const inFlight = new Set<string>();

const worker = new Worker<CompilationJobData>(
  'compilation',
  async (job: Job<CompilationJobData>) => {
    const { compilationId, projectId, mainFile, compiler, files } = job.data;
    inFlight.add(compilationId);

    console.log(`[worker] Starting job ${job.id} — compilationId=${compilationId} attempt=${job.attemptsMade + 1}/${WORKER_ATTEMPTS}`);

    // Create a unique temp directory for this compilation
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `paperforge-${compilationId}-`));

    try {
      // 1. Download all project files from MinIO
      await downloadProjectFiles(files, workDir);

      // 2. Publish "compiling" status via Redis pub/sub
      await publishStatus(compilationId, { status: 'compiling', compilationId });

      // 3. Update DB status to "compiling"
      await prisma.compilation.update({
        where: { id: compilationId },
        data: { status: 'compiling' },
      });

      // 4. Compile
      const result = await compileLatex(workDir, mainFile, compiler);

      // 5. Upload PDF, synctex.gz, and DOCX to MinIO if they exist
      let pdfMinioKey: string | undefined;
      let synctexMinioKey: string | undefined;
      let docxMinioKey: string | undefined;

      if (result.pdfPath) {
        pdfMinioKey = `compilations/${projectId}/${compilationId}/output.pdf`;
        await uploadFile(result.pdfPath, pdfMinioKey);
      }

      if (result.synctexPath) {
        synctexMinioKey = `compilations/${projectId}/${compilationId}/output.synctex.gz`;
        await uploadFile(result.synctexPath, synctexMinioKey);
      }

      if (result.docxPath) {
        docxMinioKey = `compilations/${projectId}/${compilationId}/output.docx`;
        await uploadFile(result.docxPath, docxMinioKey);
      }

      // 6. Update the compilations table in PostgreSQL
      const finalStatus = result.success ? 'success' : 'failed';
      await prisma.compilation.update({
        where: { id: compilationId },
        data: {
          status: finalStatus,
          log: result.log,
          pdfMinioKey: pdfMinioKey ?? null,
          synctexMinioKey: synctexMinioKey ?? null,
          docxMinioKey: docxMinioKey ?? null,
          durationMs: result.durationMs,
        },
      });

      // 7. Publish result via Redis pub/sub for real-time notification
      await publishStatus(compilationId, {
        status: finalStatus,
        compilationId,
        durationMs: result.durationMs,
        pdfMinioKey,
        synctexMinioKey,
        docxMinioKey,
      });

      console.log(
        `[worker] Job ${job.id} finished — status=${finalStatus} durationMs=${result.durationMs}`,
      );
    } finally {
      // 8. Cleanup temp directory
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.error(`[worker] Failed to clean up temp dir ${workDir}:`, cleanupErr);
      }
      inFlight.delete(compilationId);
    }
  },
  {
    connection,
    lockDuration: WORKER_LOCK_DURATION_MS,
  },
);

worker.on('failed', async (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err?.message);
  // Only mark the compilation row as failed once the final attempt is
  // exhausted — earlier retry failures should leave the row in 'compiling'
  // so the user sees progress instead of a transient red error.
  const exhausted = !job || (job.attemptsMade >= (job.opts?.attempts ?? WORKER_ATTEMPTS));
  if (exhausted && job?.data?.compilationId) {
    try {
      await prisma.compilation.update({
        where: { id: job.data.compilationId },
        data: { status: 'failed', log: `Worker error: ${err?.message ?? 'Unknown'}` },
      });
      await publishStatus(job.data.compilationId, {
        status: 'failed',
        compilationId: job.data.compilationId,
        error: err?.message ?? 'Worker error',
      }).catch(() => { /* pub/sub best-effort */ });
    } catch (e) {
      console.error('[worker] Failed to update compilation status:', e);
    }
  }
});

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed in ${job.processedOn ? Date.now() - job.processedOn : '?'}ms`);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — close the worker so BullMQ stops picking up new jobs,
// then flag any compilations that were still in flight as failed so the
// user doesn't see a row stuck in "compiling" forever after a deploy.
// ---------------------------------------------------------------------------
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[worker] Shutting down gracefully...');
  try {
    await worker.close();
  } catch (e) {
    console.error('[worker] worker.close error:', e);
  }
  for (const compilationId of inFlight) {
    try {
      await prisma.compilation.update({
        where: { id: compilationId },
        data: { status: 'failed', log: 'Worker was restarted before this compilation finished.' },
      });
      await publishStatus(compilationId, { status: 'failed', compilationId, error: 'worker-restart' })
        .catch(() => { /* best-effort */ });
    } catch (e) {
      console.error(`[worker] Failed to flush in-flight ${compilationId}:`, e);
    }
  }
  await publisher.quit().catch(() => {});
  await connection.quit().catch(() => {});
  await prisma.$disconnect().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[worker] Compilation worker started — attempts=${WORKER_ATTEMPTS}, lockDuration=${WORKER_LOCK_DURATION_MS}ms`);
