import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { apiSuccess, ApiErrors } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || userRole !== 'admin') return ApiErrors.forbidden();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          institution: true,
          emailVerified: true,
          storageUsedBytes: true,
          storageQuotaBytes: true,
          lockedUntil: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess({ users, total, page, limit });
  } catch (error) {
    return errorResponse(error);
  }
}
