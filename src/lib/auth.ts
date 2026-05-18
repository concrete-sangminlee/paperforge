import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { verifyCredentials } from '@/services/user-service';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';
import { getOAuthProviderConfig } from '@/lib/oauth-providers';
import { prisma } from '@/lib/prisma';

import type { Provider } from 'next-auth/providers';

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      // Rate limit login attempts: 10 per 5 minutes per email
      const rateLimitKey = `rate:login:${parsed.data.email.toLowerCase()}`;
      const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN.limit, RATE_LIMITS.LOGIN.windowSeconds);
      if (!rateLimit.allowed) return null;

      const user = await verifyCredentials(parsed.data.email, parsed.data.password);
      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];

const oauthProviders = getOAuthProviderConfig();

// Conditionally add Google OAuth provider
if (oauthProviders.google) {
  providers.push(
    Google({
      clientId: oauthProviders.google.clientId,
      clientSecret: oauthProviders.google.clientSecret,
    }),
  );
}

// Conditionally add GitHub OAuth provider
if (oauthProviders.github) {
  providers.push(
    GitHub({
      clientId: oauthProviders.github.clientId,
      clientSecret: oauthProviders.github.clientSecret,
    }),
  );
}

const isProduction = process.env.NODE_ENV === 'production';

export interface AppSessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: string;
}

/**
 * Extract the typed app user from a NextAuth session.
 * Returns null when there is no session — callers should short-circuit with
 * ApiErrors.unauthorized() in that case.
 */
export function getAppUser(session: { user?: unknown } | null | undefined): AppSessionUser | null {
  if (!session?.user || typeof session.user !== 'object') return null;
  const u = session.user as Record<string, unknown>;
  if (typeof u.id !== 'string') return null;
  return {
    id: u.id,
    email: typeof u.email === 'string' ? u.email : null,
    name: typeof u.name === 'string' ? u.name : null,
    image: typeof u.image === 'string' ? u.image : null,
    role: typeof u.role === 'string' ? u.role : 'user',
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  basePath: '/api/v1/auth',
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'user';
      }
      // Refresh avatar on initial sign-in and when the session is explicitly updated.
      // Avoids hammering the DB on every request while keeping the navbar avatar fresh.
      if (token.id && (user || trigger === 'update' || token.picture === undefined)) {
        try {
          const u = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { avatarUrl: true, name: true },
          });
          token.picture = u?.avatarUrl ?? null;
          if (u?.name) token.name = u.name;
        } catch {
          // DB unavailable — keep prior picture value
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        if (token.picture !== undefined) {
          session.user.image = token.picture as string | null;
        }
      }
      return session;
    },
  },
});
