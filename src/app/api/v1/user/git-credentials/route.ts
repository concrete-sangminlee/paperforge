import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  addGitCredential,
  listGitCredentials,
} from '@/services/git-service';

const addCredentialSchema = z.object({
  provider: z.string().min(1).max(50),
  token: z.string().min(1),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const credentials = await listGitCredentials(userId);
    return NextResponse.json(credentials);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await request.json();
    const { provider, token } = addCredentialSchema.parse(body);

    const credential = await addGitCredential(userId, provider, token);
    return NextResponse.json(credential, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
