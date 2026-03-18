import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { createShareLink } from '@/services/member-service';

type RouteParams = { params: Promise<{ id: string }> };

const createShareLinkSchema = z.object({
  permission: z.enum(['editor', 'viewer']),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const body = await request.json();
    const { permission, expiresAt } = createShareLinkSchema.parse(body);
    const link = await createShareLink(
      id,
      userId,
      permission,
      expiresAt ? new Date(expiresAt) : undefined,
    );
    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
