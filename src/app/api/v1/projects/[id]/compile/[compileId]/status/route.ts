import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { getCompilationStatus } from '@/services/compilation-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; compileId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id, compileId } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);

    const compilation = await getCompilationStatus(compileId);
    if (!compilation) {
      return NextResponse.json({ error: 'Compilation not found' }, { status: 404 });
    }

    return NextResponse.json(compilation);
  } catch (error) {
    return errorResponse(error);
  }
}
