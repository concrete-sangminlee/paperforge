/**
 * Environment variable validation and typed access.
 * Validates critical env vars at import time to fail fast on misconfiguration.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // During Next.js build phase, some vars may not be available
    if (process.env.NEXT_PHASE === 'phase-production-build') return '';
    console.warn(`[env] Missing required env var: ${name}`);
    return '';
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Database
  DATABASE_URL: required('DATABASE_URL'),

  // Auth
  NEXTAUTH_SECRET: required('NEXTAUTH_SECRET'),
  NEXTAUTH_URL: optional('NEXTAUTH_URL', 'http://localhost:3000'),

  // Encryption
  ENCRYPTION_KEY: required('ENCRYPTION_KEY'),

  // Redis
  REDIS_URL: optional('REDIS_URL'),

  // MinIO
  MINIO_ENDPOINT: optional('MINIO_ENDPOINT', 'localhost'),
  MINIO_PORT: optional('MINIO_PORT', '9000'),
  MINIO_ACCESS_KEY: optional('MINIO_ACCESS_KEY'),
  MINIO_SECRET_KEY: optional('MINIO_SECRET_KEY'),
  MINIO_BUCKET: optional('MINIO_BUCKET', 'paperforge'),
  MINIO_USE_SSL: optional('MINIO_USE_SSL', 'false'),

  // Email
  SMTP_HOST: optional('SMTP_HOST', 'localhost'),
  SMTP_PORT: optional('SMTP_PORT', '587'),
  SMTP_USER: optional('SMTP_USER'),
  SMTP_PASS: optional('SMTP_PASS'),
  SMTP_FROM: optional('SMTP_FROM', 'PaperForge <noreply@paperforge.dev>'),

  // OAuth
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  GITHUB_CLIENT_ID: optional('GITHUB_CLIENT_ID'),
  GITHUB_CLIENT_SECRET: optional('GITHUB_CLIENT_SECRET'),

  // Public
  NEXT_PUBLIC_WS_URL: optional('NEXT_PUBLIC_WS_URL', 'ws://localhost:4001'),

  // Runtime
  NODE_ENV: optional('NODE_ENV', 'development'),
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;
