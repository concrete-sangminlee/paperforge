import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { createVersion, listVersions } from '@/services/version-service';

type RouteParams = { params: Promise<{ id: string }> };

const createVersionSchema = z.object({
  label: z.string().min(1).max(255).optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    // Any project member can view versions
    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);

    const versions = await listVersions(id);
    return NextResponse.json(versions);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    // Only owners and editors can create versions
    await assertProjectRole(id, userId, ['owner', 'editor']);

    const body = await request.json();
    const { label } = createVersionSchema.parse(body);

    const version = await createVersion(id, userId, label);
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
