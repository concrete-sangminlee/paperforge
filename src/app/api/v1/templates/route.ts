import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { listTemplates, submitTemplate } from '@/services/template-service';
import { z } from 'zod';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

const submitTemplateSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional().default(''),
  category: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const templates = await listTemplates(category, search);
    return apiSuccess(templates);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const data = submitTemplateSchema.parse(body);
    const template = await submitTemplate(
      data.projectId,
      userId,
      data.name,
      data.description,
      data.category,
    );
    return apiSuccess(template, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
