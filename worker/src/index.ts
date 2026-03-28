import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { Client as MinioClient } from 'minio';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaClient } from '@prisma/client';
import { compileLatex, CompilerType } from './compiler';

// ---------------------------------------------------------------------------
// Prisma client (standard JS client — no custom adapter needed in the worker)
// ---------------------------------------------------------------------------
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Redis connection (maxRetriesPerRequest must be null for BullMQ workers)
// ---------------------------------------------------------------------------
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

// Separate pub/sub publisher client
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: null });

// ---------------------------------------------------------------------------
// MinIO client
// ---------------------------------------------------------------------------
const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

const BUCKET = process.env.MINIO_BUCKET || 'paperforge';

// ---------------------------------------------------------------------------
// Job payload type
// ---------------------------------------------------------------------------
interface CompilationJobData {
  compilationId: string;
  projectId: string;
  mainFile: string;
  compiler: CompilerType;
  files: Array<{ path: string; minioKey: string }>;
}

// ---------------------------------------------------------------------------
// Helper: download all project files into a temp directory, preserving paths
// ---------------------------------------------------------------------------
async function downloadProjectFiles(
  files: Array<{ path: string; minioKey: string }>,
  workDir: string,
): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      // Validate file path to prevent directory traversal
      if (file.path.includes('..') || file.path.startsWith('/')) {
        console.warn(`[Worker] Skipping unsafe file path: ${file.path}`);
        return;
      }
      const destPath = path.join(workDir, file.path);
      // Ensure resolved path stays within workDir
      if (!path.resolve(destPath).startsWith(path.resolve(workDir))) {
        console.warn(`[Worker] Path escape attempt blocked: ${file.path}`);
        return;
      }
      const destDir = path.dirname(destPath);
      fs.mkdirSync(destDir, { recursive: true });
      await minioClient.fGetObject(BUCKET, file.minioKey, destPath);
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
const worker = new Worker<CompilationJobData>(
  'compilation',
  async (job: Job<CompilationJobData>) => {
    const { compilationId, projectId, mainFile, compiler, files } = job.data;

    console.log(`[worker] Starting job ${job.id} — compilationId=${compilationId}`);

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
    }
  },
  { connection },
);

worker.on('failed', async (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err?.message);
  if (job?.data?.compilationId) {
    try {
      await prisma.compilation.update({
        where: { id: job.data.compilationId },
        data: { status: 'failed', log: `Worker error: ${err?.message ?? 'Unknown'}` },
      });
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
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown() {
  console.log('[worker] Shutting down gracefully...');
  await worker.close();
  await publisher.quit();
  await connection.quit();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('[worker] Compilation worker started, listening on queue: compilation');
