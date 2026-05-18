import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProjectSchema } from '@/lib/validation';
import { createProject, listProjects } from '@/services/project-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

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

    // 20 projects per hour per user. Goes through the shared helper so the
    // 429 response matches the wrapped envelope every other route uses.
    const limited = await enforceRateLimit(
      `rate:create-project:${userId}`,
      { limit: 20, windowSeconds: 3600 },
      'Too many projects created. Please try again later.',
    );
    if (limited) return limited;

    const body = await request.json();
    const data = createProjectSchema.parse(body);
    const project = await createProject(userId, data);
    return apiSuccess(project, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
