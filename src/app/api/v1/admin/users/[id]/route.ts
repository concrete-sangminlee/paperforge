import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse, ApiError } from '@/lib/errors';
import { ApiErrors, apiSuccess } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/services/audit-service';
import { z } from 'zod';

const patchUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  suspend: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || adminRole !== 'admin') {
      return ApiErrors.forbidden();
    }
    const adminId = (session.user as { id: string }).id;
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User not found');

    const body = await request.json();
    const data = patchUserSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    const auditDetails: Record<string, unknown> = {};

    if (data.role !== undefined) {
      updateData.role = data.role;
      auditDetails.role = { from: user.role, to: data.role };
    }

    if (data.suspend !== undefined) {
      if (data.suspend) {
        updateData.lockedUntil = new Date('2099-01-01T00:00:00Z');
        auditDetails.action = 'suspend';
      } else {
        updateData.lockedUntil = null;
        updateData.failedLoginAttempts = 0;
        auditDetails.action = 'unsuspend';
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lockedUntil: true,
      },
    });

    await logAuditAction(adminId, 'update_user', 'user', id, auditDetails);

    return apiSuccess(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
