import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { deleteGitCredential } from '@/services/git-service';

type RouteParams = { params: Promise<{ credentialId: string }> };

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { credentialId } = await params;

    await deleteGitCredential(credentialId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
