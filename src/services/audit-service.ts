import { prisma } from '@/lib/prisma';

export async function logAuditAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
) {
  return prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details: details ?? undefined,
    },
  });
}

export async function getAuditLog(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count(),
  ]);
  return { entries, total, page, limit };
}
