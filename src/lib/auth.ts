import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import { verifyCredentials } from '@/services/user-service';
import { loginSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { RATE_LIMITS } from '@/lib/constants';

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

// Conditionally add Google OAuth provider
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

// Conditionally add GitHub OAuth provider
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  );
}

const isProduction = process.env.NODE_ENV === 'production';

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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
