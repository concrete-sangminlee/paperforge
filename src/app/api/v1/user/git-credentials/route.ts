import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  addGitCredential,
  listGitCredentials,
} from '@/services/git-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

const addCredentialSchema = z.object({
  provider: z.string().min(1).max(50),
  token: z.string().min(1),
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
    const body = await request.json();
    const { provider, token } = addCredentialSchema.parse(body);
    const credential = await addGitCredential(userId, provider, token);
    return apiSuccess(credential, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
