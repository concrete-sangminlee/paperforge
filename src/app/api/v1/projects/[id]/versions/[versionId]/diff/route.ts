import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { getVersionDiff } from '@/services/version-service';

type RouteParams = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id, versionId } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);

    const diff = await getVersionDiff(id, versionId);
    return NextResponse.json(diff);
  } catch (error) {
    return errorResponse(error);
  }
}
