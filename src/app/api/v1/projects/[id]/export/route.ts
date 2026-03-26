import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { assertProjectRole } from '@/services/project-service';
import { listFiles, getFileContent } from '@/services/file-service';
import { ApiErrors } from '@/lib/api-response';

/**
 * GET /api/v1/projects/:id/export
 * Export entire project as a downloadable ZIP archive.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return ApiErrors.unauthorized();
    const userId = (session.user as { id: string }).id;
    const { id } = await params;

    await assertProjectRole(id, userId, ['owner', 'editor', 'viewer']);

    const files = await listFiles(id);

    // Dynamically import archiver-like ZIP creation
    // Using a simple approach with raw ZIP format
    const encoder = new TextEncoder();
    const zipParts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const file of files) {
      let content: Uint8Array;
      try {
        const text = await getFileContent(id, file.path);
        content = encoder.encode(text);
      } catch {
        // Skip files that can't be read (binary files without text content)
        continue;
      }

      const pathBytes = encoder.encode(file.path);
      const crc = crc32(content);

      // Local file header
      const header = new Uint8Array(30 + pathBytes.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); // signature
      view.setUint16(4, 20, true); // version needed
      view.setUint16(6, 0, true); // flags
      view.setUint16(8, 0, true); // compression (store)
      view.setUint16(10, 0, true); // mod time
      view.setUint16(12, 0, true); // mod date
      view.setUint32(14, crc, true); // crc32
      view.setUint32(18, content.length, true); // compressed size
      view.setUint32(22, content.length, true); // uncompressed size
      view.setUint16(26, pathBytes.length, true); // filename length
      view.setUint16(28, 0, true); // extra length
      header.set(pathBytes, 30);

      zipParts.push(header);
      zipParts.push(content);

      // Central directory entry
      const cdEntry = new Uint8Array(46 + pathBytes.length);
      const cdView = new DataView(cdEntry.buffer);
      cdView.setUint32(0, 0x02014b50, true); // signature
      cdView.setUint16(4, 20, true); // version made by
      cdView.setUint16(6, 20, true); // version needed
      cdView.setUint16(8, 0, true); // flags
      cdView.setUint16(10, 0, true); // compression
      cdView.setUint16(12, 0, true); // mod time
      cdView.setUint16(14, 0, true); // mod date
      cdView.setUint32(16, crc, true); // crc32
      cdView.setUint32(20, content.length, true); // compressed size
      cdView.setUint32(24, content.length, true); // uncompressed size
      cdView.setUint16(28, pathBytes.length, true); // filename length
      cdView.setUint16(30, 0, true); // extra length
      cdView.setUint16(32, 0, true); // comment length
      cdView.setUint16(34, 0, true); // disk number
      cdView.setUint16(36, 0, true); // internal attrs
      cdView.setUint32(38, 0, true); // external attrs
      cdView.setUint32(42, offset, true); // local header offset
      cdEntry.set(pathBytes, 46);

      centralDir.push(cdEntry);
      offset += header.length + content.length;
    }

    // End of central directory
    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDir) cdSize += cd.length;

    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // signature
    eocdView.setUint16(4, 0, true); // disk number
    eocdView.setUint16(6, 0, true); // cd disk
    eocdView.setUint16(8, centralDir.length, true); // entries on disk
    eocdView.setUint16(10, centralDir.length, true); // total entries
    eocdView.setUint32(12, cdSize, true); // cd size
    eocdView.setUint32(16, cdOffset, true); // cd offset
    eocdView.setUint16(20, 0, true); // comment length

    // Combine all parts
    const totalSize = offset + cdSize + 22;
    const zip = new Uint8Array(totalSize);
    let pos = 0;
    for (const part of zipParts) { zip.set(part, pos); pos += part.length; }
    for (const cd of centralDir) { zip.set(cd, pos); pos += cd.length; }
    zip.set(eocd, pos);

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="project-${id.slice(0, 8)}.zip"`,
        'Content-Length': String(totalSize),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Simple CRC32 implementation for ZIP format. */
function crc32(data: Uint8Array): number {
  let crc = ~0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return ~crc >>> 0;
}
