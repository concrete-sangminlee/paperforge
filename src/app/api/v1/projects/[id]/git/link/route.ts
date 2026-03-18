import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { linkGitRemote } from '@/services/git-service';

type RouteParams = { params: Promise<{ id: string }> };

const linkSchema = z.object({
  remoteUrl: z.string().url(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    await assertProjectRole(id, userId, ['owner']);

    const body = await request.json();
    const { remoteUrl } = linkSchema.parse(body);

    await linkGitRemote(id, remoteUrl);
    return NextResponse.json({ success: true, remoteUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
