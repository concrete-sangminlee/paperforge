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
import { env } from '@/lib/env';

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

const isProduction = env.isProduction;

export type { AppSessionUser } from '@/lib/session';
export { getAppUser } from '@/lib/session';

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
