import { env } from './env';

const DEFAULT_APP_BASE_URL = 'https://projectlatexcompiler.vercel.app';

function normalizeBaseUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function getAppBaseUrl(): string {
  return (
    normalizeBaseUrl(env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(env.NEXTAUTH_URL) ??
    normalizeBaseUrl(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(env.VERCEL_URL) ??
    DEFAULT_APP_BASE_URL
  );
}
