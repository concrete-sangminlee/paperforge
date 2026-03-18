import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { joinViaShareLink } from '@/services/member-service';

type RouteParams = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { token } = await params;
    const project = await joinViaShareLink(token, userId);
    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error);
  }
}
