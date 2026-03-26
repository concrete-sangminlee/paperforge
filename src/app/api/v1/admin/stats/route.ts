import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || userRole !== 'admin') {
      return ApiErrors.forbidden();
    }

    const [userCount, projectCount, compilationCount, storageResult] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.compilation.count(),
      prisma.user.aggregate({ _sum: { storageUsedBytes: true } }),
    ]);

    return apiSuccess({
      userCount,
      projectCount,
      compilationCount,
      storageUsedBytes: storageResult._sum.storageUsedBytes?.toString() ?? '0',
    });
  } catch (error) {
    return errorResponse(error);
  }
}
