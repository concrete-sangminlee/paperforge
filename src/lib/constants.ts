/**
 * Centralized application constants.
 * All magic numbers, thresholds, and configuration values belong here.
 */

// ── Rate Limiting ────────────────────────────────────────
export const RATE_LIMITS = {
  LOGIN:          { limit: 10, windowSeconds: 300 },   // 10 per 5 min per email
  REGISTER:       { limit: 5,  windowSeconds: 900 },   // 5 per 15 min per IP
  FORGOT_PASSWORD:{ limit: 5,  windowSeconds: 900 },   // 5 per 15 min per IP
  RESET_PASSWORD: { limit: 5,  windowSeconds: 900 },   // 5 per 15 min per IP
  COMPILATION:    { limit: 10, windowSeconds: 60 },    // 10 per min per user per project
  EXPORT:         { limit: 10, windowSeconds: 3600 },  // 10 per hour per user
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
