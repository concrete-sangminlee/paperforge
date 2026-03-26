import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { ApiErrors, apiSuccess } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || userRole !== 'admin') {
      return ApiErrors.forbidden();
    }

    const templates = await prisma.template.findMany({
      where: { isApproved: false },
      include: {
        author: { select: { id: true, name: true, email: true } },
        sourceProject: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess(templates);
  } catch (error) {
    return errorResponse(error);
  }
}
