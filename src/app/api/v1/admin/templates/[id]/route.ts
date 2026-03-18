import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse, ApiError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { logAuditAction } from '@/services/audit-service';
import { z } from 'zod';

const patchTemplateSchema = z.object({
  approved: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const adminRole = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || adminRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const adminId = (session.user as { id: string }).id;
    const { id } = await params;

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) throw new ApiError(404, 'Template not found');

    const body = await request.json();
    const { approved } = patchTemplateSchema.parse(body);

    const updated = await prisma.template.update({
      where: { id },
      data: { isApproved: approved },
    });

    await logAuditAction(
      adminId,
      approved ? 'approve_template' : 'reject_template',
      'template',
      id,
      { templateName: template.name },
    );

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
