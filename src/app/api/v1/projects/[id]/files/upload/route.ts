import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { uploadBinaryFile } from '@/services/file-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    await assertProjectRole(id, userId, ['owner', 'editor']);

    const formData = await request.formData();
    const uploaded = formData.get('file');
    if (!uploaded || !(uploaded instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Allow an explicit path override; fall back to the uploaded filename.
    const filePath =
      (formData.get('path') as string | null) || uploaded.name;
    const mimeType = uploaded.type || 'application/octet-stream';
    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const file = await uploadBinaryFile(id, filePath, buffer, mimeType);
    return NextResponse.json({ file }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
