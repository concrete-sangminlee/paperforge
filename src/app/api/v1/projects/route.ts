import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProjectSchema } from '@/lib/validation';
import { createProject, listProjects } from '@/services/project-service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const projects = await listProjects(userId);
    return NextResponse.json(projects);
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
    const data = createProjectSchema.parse(body);
    const project = await createProject(userId, data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
