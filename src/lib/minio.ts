import { Client } from 'minio';

const globalForMinio = globalThis as unknown as { minioClient: Client };

function createMinioClient(): Client {
  return new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || '',
    secretKey: process.env.MINIO_SECRET_KEY || '',
  });
}

export const minioClient = globalForMinio.minioClient || createMinioClient();

if (process.env.NODE_ENV !== 'production') globalForMinio.minioClient = minioClient;

/**
 * Returns the configured bucket name.
 */
export function getBucket(): string {
  return process.env.MINIO_BUCKET || 'paperforge';
}

/**
 * Ensures the configured bucket exists, creating it if necessary.
 * Caches the result so subsequent calls skip the network roundtrip.
 */
let bucketVerified = false;
export async function ensureBucket(): Promise<void> {
  if (bucketVerified) return;
  const bucket = getBucket();
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket);
  }
  bucketVerified = true;
}
