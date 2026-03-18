import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { listFiles } from '@/services/file-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);
    const files = await listFiles(id);
    return NextResponse.json(files);
  } catch (error) {
    return errorResponse(error);
  }
}
