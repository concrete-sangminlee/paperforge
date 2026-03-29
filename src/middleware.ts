import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Add request ID for tracing
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXTAUTH_URL,
      ...(process.env.NODE_ENV === 'development'
        ? ['http://localhost:3000', 'http://localhost']
        : []),
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    // CSRF protection: reject cross-origin state-changing requests
    // Sec-Fetch-Site is sent by all modern browsers and cannot be spoofed
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const secFetchSite = request.headers.get('sec-fetch-site');
      // Allow: same-origin, none (direct navigation), and missing header (older browsers/curl)
      if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
        // Skip CSRF check for NextAuth callback routes (OAuth providers use /api/auth/)
        if (!pathname.startsWith('/api/auth/')) {
          return new NextResponse(JSON.stringify({ error: 'CSRF validation failed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }
  }

  // Block access to admin pages for non-authenticated users (basic check)
  if (pathname.startsWith('/admin')) {
    const sessionToken =
      request.cookies.get('next-auth.session-token')?.value ||
      request.cookies.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/editor/:path*',
    '/projects/:path*',
  ],
};
