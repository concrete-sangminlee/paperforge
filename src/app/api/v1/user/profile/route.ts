import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const patchProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  institution: z.string().max(255).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        bio: true,
        avatarUrl: true,
        settings: true,
        storageUsedBytes: true,
        storageQuotaBytes: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const body = await request.json();
    const data = patchProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.institution !== undefined ? { institution: data.institution } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        institution: true,
        bio: true,
        avatarUrl: true,
        settings: true,
        storageUsedBytes: true,
        storageQuotaBytes: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
