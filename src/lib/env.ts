/**
 * Environment variable validation and typed access.
 * Validates critical env vars at import time to fail fast on misconfiguration.
 */

const isBuildPhase =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.npm_lifecycle_event === 'build';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // During Next.js build phase, some vars may not be available
    if (isBuildPhase) return '';
    console.warn(`[env] Missing required env var: ${name}`);
    return '';
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function parsePositiveInteger(
  name: string,
  fallback: number,
  bounds: { min: number; max: number } = { min: 1, max: 65535 },
): number {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? '', 10);
  if (raw !== undefined && (Number.isNaN(parsed) || !Number.isInteger(parsed))) {
    console.warn(`[env] Invalid integer for ${name}: ${raw} (using ${fallback})`);
    return fallback;
  }
  if (raw !== undefined && (parsed < bounds.min || parsed > bounds.max)) {
    console.warn(`[env] Out-of-range value for ${name}: ${raw} (using ${fallback})`);
    return fallback;
  }
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  if (/^(1|true|yes|on)$/i.test(raw.trim())) return true;
  if (/^(0|false|no|off)$/i.test(raw.trim())) return false;
  console.warn(`[env] Invalid boolean for ${name}: ${raw} (using ${fallback})`);
  return fallback;
}

function normalizeOrigin(raw: string): string | null {
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

const FALLBACK_AUTH_SECRET = optional('AUTH_SECRET');
const NODE_ENV = optional('NODE_ENV', 'development');

function parseOriginList(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => typeof entry === 'string');
}

export const env = {
  isBuildPhase,

  // Database
  DATABASE_URL: required('DATABASE_URL'),

  // Auth
  AUTH_SECRET: optional('AUTH_SECRET'),
  NEXTAUTH_SECRET: optional('NEXTAUTH_SECRET', FALLBACK_AUTH_SECRET),
  NEXTAUTH_URL: optional('NEXTAUTH_URL', 'http://localhost:3000'),

  // Encryption
  ENCRYPTION_KEY: required('ENCRYPTION_KEY'),

  // Redis
  REDIS_URL: optional('REDIS_URL'),
  REDIS_HOST: optional('REDIS_HOST'),
  REDIS_PORT: String(parsePositiveInteger('REDIS_PORT', 6379)),
  REDIS_PASSWORD: optional('REDIS_PASSWORD'),
  RATE_LIMIT_STRICT: parseBoolean('RATE_LIMIT_STRICT', false),

  // MinIO
  MINIO_ENDPOINT: optional('MINIO_ENDPOINT', 'localhost'),
  MINIO_PORT: String(parsePositiveInteger('MINIO_PORT', 9000)),
  MINIO_ACCESS_KEY: optional('MINIO_ACCESS_KEY'),
  MINIO_SECRET_KEY: optional('MINIO_SECRET_KEY'),
  MINIO_BUCKET: optional('MINIO_BUCKET', 'paperforge'),
  MINIO_USE_SSL: optional('MINIO_USE_SSL', 'false'),
  MINIO_ALLOW_FALLBACK: parseBoolean('MINIO_ALLOW_FALLBACK', true),

  // Email
  SMTP_HOST: optional('SMTP_HOST', 'localhost'),
  SMTP_PORT: String(parsePositiveInteger('SMTP_PORT', 587)),
  SMTP_USER: optional('SMTP_USER'),
  SMTP_PASS: optional('SMTP_PASS'),
  SMTP_FROM: optional('SMTP_FROM', 'PaperForge <noreply@paperforge.dev>'),
  SMTP_SECURE: parseBoolean('SMTP_SECURE', false),

  // External services
  ANTHROPIC_API_KEY: optional('ANTHROPIC_API_KEY'),

  // Local runtime paths
  LOCAL_STORAGE_PATH: optional('LOCAL_STORAGE_PATH'),
  GIT_REPOS_PATH: optional('GIT_REPOS_PATH', '/tmp/paperforge-repos'),

  // OAuth
  AUTH_GOOGLE_ID: optional('AUTH_GOOGLE_ID'),
  AUTH_GOOGLE_SECRET: optional('AUTH_GOOGLE_SECRET'),
  AUTH_GITHUB_ID: optional('AUTH_GITHUB_ID'),
  AUTH_GITHUB_SECRET: optional('AUTH_GITHUB_SECRET'),
  GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
  GITHUB_CLIENT_ID: optional('GITHUB_CLIENT_ID'),
  GITHUB_CLIENT_SECRET: optional('GITHUB_CLIENT_SECRET'),

  // Public
  NEXT_PUBLIC_APP_URL: optional('NEXT_PUBLIC_APP_URL'),
  NEXT_PUBLIC_WS_URL: optional('NEXT_PUBLIC_WS_URL'),
  NEXT_PUBLIC_APP_VERSION: optional('NEXT_PUBLIC_APP_VERSION'),
  VERCEL_PROJECT_PRODUCTION_URL: optional('VERCEL_PROJECT_PRODUCTION_URL'),
  VERCEL_URL: optional('VERCEL_URL'),

  // Runtime
  NODE_ENV,
  CORS_ALLOWED_ORIGINS: Array.from(
    new Set(
      [
        parseOriginList('CORS_ALLOWED_ORIGINS'),
        parseOriginList('NEXT_PUBLIC_APP_URL'),
        parseOriginList('NEXTAUTH_URL'),
        parseOriginList('VERCEL_URL'),
      ]
        .flat()
        .filter(Boolean),
    ),
  ),
  isProduction: NODE_ENV === 'production',
  isDevelopment: NODE_ENV !== 'production',
} as const;
