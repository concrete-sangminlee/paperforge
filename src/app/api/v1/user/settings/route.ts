import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const patchSettingsSchema = z.object({
  settings: z.record(z.unknown()),
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
      select: { settings: true },
    });

    return NextResponse.json({ settings: user?.settings ?? {} });
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
    const { settings: incoming } = patchSettingsSchema.parse(body);

    // Fetch current settings and merge
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const current =
      user?.settings && typeof user.settings === 'object' && !Array.isArray(user.settings)
        ? (user.settings as Record<string, unknown>)
        : {};

    const merged = { ...current, ...incoming };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { settings: merged },
      select: { settings: true },
    });

    return NextResponse.json({ settings: updated.settings });
  } catch (error) {
    return errorResponse(error);
  }
}
