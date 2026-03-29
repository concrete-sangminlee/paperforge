import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createProjectSchema } from '@/lib/validation';
import { createProject, listProjects } from '@/services/project-service';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

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

    // Rate limit: 20 projects per hour per user
    const rl = await checkRateLimit(`rate:create-project:${userId}`, 20, 3600);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many projects created. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(20, rl) },
      );
    }

    const body = await request.json();
    const data = createProjectSchema.parse(body);
    const project = await createProject(userId, data);
    return apiSuccess(project, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
