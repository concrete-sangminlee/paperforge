import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiSuccess, ApiErrors } from '@/lib/api-response';
import { safeString } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const patchProfileSchema = z.object({
  name: safeString.min(1).max(255).optional(),
  institution: safeString.max(255).optional().nullable(),
  bio: safeString.max(1000).optional().nullable(),
});

const profileSelect = {
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
  passwordHash: true,
  createdAt: true,
} as const;

function serializeProfile<T extends { passwordHash: string | null }>(user: T | null) {
  if (!user) return null;
  const { passwordHash, ...profile } = user;
  return { ...profile, hasPassword: !!passwordHash };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });

    return apiSuccess(serializeProfile(user));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
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
      select: profileSelect,
    });

    return apiSuccess(serializeProfile(updated));
  } catch (error) {
    return errorResponse(error);
  }
}
