/**
 * Centralized application constants.
 * All magic numbers, thresholds, and configuration values belong here.
 */

// ── Rate Limiting ────────────────────────────────────────
export const RATE_LIMITS = {
  LOGIN:          { limit: 10, windowSeconds: 300 },   // 10 per 5 min per email
  LOGIN_IP:       { limit: 50, windowSeconds: 300 },   // 50 credential attempts per 5 min per IP
  REGISTER:       { limit: 5,  windowSeconds: 900 },   // 5 per 15 min per IP
  FORGOT_PASSWORD:       { limit: 5, windowSeconds: 900 },    // 5 per 15 min per IP
  FORGOT_PASSWORD_EMAIL: { limit: 3, windowSeconds: 3600 },   // 3 per hour per email (anti-bombing)
  RESET_PASSWORD: { limit: 5,  windowSeconds: 900 },   // 5 per 15 min per IP
  COMPILATION:    { limit: 10, windowSeconds: 60 },    // 10 per min per user per project
  EXPORT:         { limit: 10, windowSeconds: 3600 },  // 10 per hour per user
  RENDER:         { limit: 60, windowSeconds: 60 },    // 60 KaTeX renders per min per IP (public)
  GIT_OP:         { limit: 10, windowSeconds: 60 },    // 10 push/pull per min per user per project
  SHARE_LINK:     { limit: 30, windowSeconds: 3600 },  // 30 share-link creations per hour per user
  FILE_UPLOAD:    { limit: 30, windowSeconds: 60 },    // 30 binary uploads per min per user
  IMPORT:         { limit: 5,  windowSeconds: 3600 },  // 5 zip/url imports per hour per user
  ACCOUNT_DELETE: { limit: 3,  windowSeconds: 86400 }, // 3 account-deletion attempts per day per user
  AVATAR_UPLOAD:  { limit: 10, windowSeconds: 3600 },  // 10 avatar uploads per hour per user
  AI_USER:        { limit: 20, windowSeconds: 3600 },  // 20 AI assist calls per hour per user
  // Global cap across all users — protects deployment from runaway Anthropic spend
  // during viral moments / abuse. Tune per deployment budget.
  AI_GLOBAL:      { limit: 1000, windowSeconds: 3600 },
} as const;

// ── Authentication ───────────────────────────────────────
export const AUTH = {
  MAX_FAILED_ATTEMPTS: 20,
  LOCKOUT_DURATION_MS: 60 * 60 * 1000,  // 1 hour
  SESSION_MAX_AGE: 7 * 24 * 60 * 60,    // 7 days in seconds
  JWT_MIN_SECRET_LENGTH: 32,
  PASSWORD_RESET_EXPIRY: '1h',
  EMAIL_VERIFY_EXPIRY: '24h',
} as const;

// ── Editor ───────────────────────────────────────────────
export const EDITOR = {
  AUTO_COMPILE_DEBOUNCE_MS: 2000,
  STATUS_POLL_INTERVAL_MS: 1000,
  MAX_POLL_ATTEMPTS: 120,           // 2 min with 1s interval
  CLIPBOARD_FEEDBACK_MS: 2000,
} as const;

// ── Limits ───────────────────────────────────────────────
export const LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,       // 50 MB
  MAX_PROJECT_SIZE: 500 * 1024 * 1024,    // 500 MB
  MAX_USER_STORAGE: 2 * 1024 * 1024 * 1024, // 2 GB
  MAX_COMPILATION_FILES: 500,
  MAX_PROJECTS_PER_PAGE: 200,
  MAX_MEMBERS_PER_PROJECT_RESPONSE: 10,
  MAX_WEBSOCKET_CONNECTIONS_PER_USER: 20,
  MAX_WEBSOCKET_MESSAGE_SIZE: 10 * 1024 * 1024, // 10 MB
} as const;

// ── File Path Validation ─────────────────────────────────
/** Validate a file path is safe (no directory traversal, no control chars). */
export function isValidFilePath(path: string): boolean {
  if (path.length > 1024 || path.length === 0) return false;
  // Reject backslashes anywhere to prevent Windows-style traversal (foo\..\bar)
  if (path.includes('\\')) return false;
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  // Block Windows absolute paths (C:\...) and UNC paths (\\server)
  if (/^[A-Za-z]:/.test(path)) return false;
  // Block null bytes and control characters
  if (/[\x00-\x1f]/.test(path)) return false;
  // Block double slashes that could confuse path resolution
  if (path.includes('//')) return false;
  return true;
}
