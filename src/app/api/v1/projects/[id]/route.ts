import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { updateProjectSchema } from '@/lib/validation';
import {
  getProject,
  updateProject,
  deleteProject,
} from '@/services/project-service';

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
    const project = await getProject(id, userId);
    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const data = updateProjectSchema.parse(body);
    const project = await updateProject(id, userId, data);
    return NextResponse.json(project);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
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
    await deleteProject(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
