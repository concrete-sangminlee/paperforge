import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fileFindFirst: vi.fn(),
  fileUpdate: vi.fn(),
  fileCreate: vi.fn(),
  ensureBucket: vi.fn(),
  putObject: vi.fn(),
  assertStorageQuota: vi.fn(),
  getProjectOwnerId: vi.fn(),
  syncUserStorageUsed: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    file: {
      findFirst: mocks.fileFindFirst,
      update: mocks.fileUpdate,
      create: mocks.fileCreate,
    },
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    LOCAL_STORAGE_PATH: '',
    MINIO_ALLOW_FALLBACK: false,
  },
}));

vi.mock('@/lib/minio', () => ({
  ensureBucket: mocks.ensureBucket,
  getBucket: () => 'bucket',
  minioClient: {
    putObject: mocks.putObject,
  },
}));

vi.mock('@/lib/storage', () => ({
  assertStorageQuota: mocks.assertStorageQuota,
  getProjectOwnerId: mocks.getProjectOwnerId,
  syncUserStorageUsed: mocks.syncUserStorageUsed,
}));

import { createFile, uploadBinaryFile } from '@/services/file-service';

describe('file-service writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProjectOwnerId.mockResolvedValue('owner-1');
    mocks.ensureBucket.mockResolvedValue(undefined);
    mocks.putObject.mockResolvedValue(undefined);
    mocks.fileUpdate.mockResolvedValue({ id: 'file-1' });
    mocks.fileCreate.mockResolvedValue({ id: 'file-1' });
    mocks.assertStorageQuota.mockResolvedValue(undefined);
    mocks.syncUserStorageUsed.mockResolvedValue(BigInt(0));
  });

  it('updates the active file row before considering soft-deleted duplicates', async () => {
    mocks.fileFindFirst.mockResolvedValueOnce({
      id: 'active-file',
      deletedAt: null,
      sizeBytes: BigInt(3),
    });

    await createFile('project-1', 'main.tex', 'hello');

    expect(mocks.fileFindFirst).toHaveBeenCalledTimes(1);
    expect(mocks.fileFindFirst).toHaveBeenCalledWith({
      where: { projectId: 'project-1', path: 'main.tex', deletedAt: null },
      select: { id: true, deletedAt: true, sizeBytes: true },
    });
    expect(mocks.assertStorageQuota).toHaveBeenCalledWith('owner-1', 2);
    expect(mocks.fileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'active-file' } }),
    );
  });

  it('reuses the newest soft-deleted row only when no active row exists', async () => {
    const deletedAt = new Date('2026-06-01T00:00:00.000Z');
    mocks.fileFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'deleted-file',
        deletedAt,
        sizeBytes: BigInt(99),
      });

    await createFile('project-1', 'main.tex', 'hello');

    expect(mocks.fileFindFirst).toHaveBeenNthCalledWith(2, {
      where: { projectId: 'project-1', path: 'main.tex', deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: { id: true, deletedAt: true, sizeBytes: true },
    });
    expect(mocks.assertStorageQuota).toHaveBeenCalledWith('owner-1', 5);
    expect(mocks.fileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'deleted-file' },
        data: expect.objectContaining({ deletedAt: null }),
      }),
    );
  });

  it('clears stale text content when a binary upload does not write a DB fallback', async () => {
    mocks.fileFindFirst.mockResolvedValueOnce({
      id: 'active-file',
      deletedAt: null,
      sizeBytes: BigInt(4),
    });

    await uploadBinaryFile(
      'project-1',
      'figure.png',
      Buffer.from('binary data'),
      'image/png',
    );

    expect(mocks.fileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'active-file' },
        data: expect.objectContaining({
          isBinary: true,
          content: null,
        }),
      }),
    );
  });
});
