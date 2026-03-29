import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  addGitCredential,
  listGitCredentials,
} from '@/services/git-service';
import { apiSuccess, apiError, ApiErrors } from '@/lib/api-response';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const ALLOWED_PROVIDERS = ['github', 'gitlab', 'bitbucket', 'gitea', 'azure-devops'] as const;

const addCredentialSchema = z.object({
  provider: z.enum(ALLOWED_PROVIDERS),
  token: z.string().min(1).max(4096),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const credentials = await listGitCredentials(userId);
    return apiSuccess(credentials);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    // Rate limit: 10 credential additions per hour per user
    const rl = await checkRateLimit(`rate:git-cred:${userId}`, 10, 3600);
    if (!rl.allowed) {
      return apiError('Too many credential operations. Please try again later.', 429, 'RATE_LIMITED', {
        ...rateLimitHeaders(10, rl),
      });
    }

    const body = await request.json();
    const { provider, token } = addCredentialSchema.parse(body);
    const credential = await addGitCredential(userId, provider, token);
    return apiSuccess(credential, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
