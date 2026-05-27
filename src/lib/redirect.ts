/**
 * Sanitize a post-login redirect URL to same-origin relative paths only.
 * Rejects absolute URLs, protocol-relative URLs (//host), and encoded variants.
 */
export function sanitizeCallbackUrl(
  url: string | null | undefined,
  fallback = '/projects',
): string {
  if (!url) return fallback;
  // Must start with / but not // (protocol-relative URL like //evil.com)
  if (!url.startsWith('/') || url.startsWith('//')) return fallback;
  // Reject encoded protocol-relative URLs (e.g. /%2F%2Fevil.com → //evil.com)
  try {
    if (decodeURIComponent(url).startsWith('//')) return fallback;
  } catch {
    return fallback;
  }
  return url;
}
