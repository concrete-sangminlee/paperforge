import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProjectSchema } from '@/lib/validation';
import { createProject, listProjects } from '@/services/project-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const projects = await listProjects(userId);
    return apiSuccess(projects);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const data = createProjectSchema.parse(body);
    const project = await createProject(userId, data);
    return apiSuccess(project, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
