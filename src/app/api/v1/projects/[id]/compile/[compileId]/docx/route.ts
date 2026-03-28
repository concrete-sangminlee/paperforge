import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse, ApiError } from '@/lib/errors';
import { ApiErrors } from '@/lib/api-response';
import { assertProjectRole } from '@/services/project-service';
import { prisma } from '@/lib/prisma';
import { minioClient, getBucket } from '@/lib/minio';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; compileId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return ApiErrors.unauthorized();
    }
    const userId = (session.user as { id: string }).id;
    const { id, compileId } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);

    const compilation = await prisma.compilation.findFirst({
      where: { id: compileId, projectId: id },
      select: { docxMinioKey: true, status: true },
    });

    if (!compilation) {
      throw new ApiError(404, 'Compilation not found');
    }
    if (!compilation.docxMinioKey) {
      throw new ApiError(404, 'DOCX not available for this compilation');
    }

    const bucket = getBucket();
    const stream = await minioClient.getObject(bucket, compilation.docxMinioKey);

    // Collect the stream into a buffer and return as a DOCX response
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `attachment; filename="output.docx"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
