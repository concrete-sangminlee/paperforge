import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import {
  getFileContent,
  createFile,
  deleteFile,
} from '@/services/file-service';

type RouteParams = { params: Promise<{ id: string; path: string[] }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);
    const filePath = path.join('/');
    const content = await getFileContent(id, filePath);
    return NextResponse.json({ content });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);
    const filePath = path.join('/');
    const body = await request.json();
    const file = await createFile(id, filePath, body.content);
    return NextResponse.json({ file });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id, path } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);
    const filePath = path.join('/');
    await deleteFile(id, filePath);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return errorResponse(error);
  }
}
