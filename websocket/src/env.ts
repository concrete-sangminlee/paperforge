function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function parsePositiveInteger(name: string, fallback: number, bounds = { min: 1, max: 2147483647 }): number {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? '', 10);
  if (raw === undefined || Number.isNaN(parsed) || !Number.isInteger(parsed)) return fallback;
  if (parsed < bounds.min || parsed > bounds.max) return fallback;
  return parsed;
}

export const env = {
  DATABASE_URL: required('DATABASE_URL'),

  WS_PORT: parsePositiveInteger('WS_PORT', 4001, { min: 1, max: 65535 }),
  WS_IDLE_TIMEOUT_MS: parsePositiveInteger('WS_IDLE_TIMEOUT_MS', 30 * 60 * 1000, { min: 1000, max: 86_400_000 }),

  NEXTAUTH_SECRET: optional('NEXTAUTH_SECRET'),
  AUTH_SECRET: optional('AUTH_SECRET'),
};
