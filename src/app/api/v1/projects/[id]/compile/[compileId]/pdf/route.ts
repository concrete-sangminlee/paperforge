import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse, ApiError } from '@/lib/errors';
import { ApiErrors } from '@/lib/api-response';
import { assertProjectRole } from '@/services/project-service';
import { prisma } from '@/lib/prisma';
import { minioClient, getBucket } from '@/lib/minio';
import { LIMITS, isValidFilePath } from '@/lib/constants';

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
      select: { pdfMinioKey: true, status: true },
    });

    if (!compilation) {
      throw new ApiError(404, 'Compilation not found');
    }
    if (!compilation.pdfMinioKey) {
      throw new ApiError(404, 'PDF not available for this compilation');
    }
    if (!isValidFilePath(compilation.pdfMinioKey)) {
      throw new ApiError(500, 'Invalid storage key');
    }

    const bucket = getBucket();
    const stream = await minioClient.getObject(bucket, compilation.pdfMinioKey);

    // Collect the stream into a buffer with size limit
    const chunks: Buffer[] = [];
    let totalSize = 0;
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > LIMITS.MAX_FILE_SIZE) {
          stream.destroy();
          reject(new ApiError(413, 'PDF file exceeds maximum size'));
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.length),
        'Content-Disposition': `inline; filename="output.pdf"`,
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
