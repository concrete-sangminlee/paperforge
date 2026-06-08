import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queueAdd: vi.fn(),
  projectFindFirst: vi.fn(),
  compilationCreate: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn(function MockQueue() {
    return {
      add: mocks.queueAdd,
    };
  }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    isBuildPhase: false,
    REDIS_URL: '',
    REDIS_HOST: 'redis.local',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: '',
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findFirst: mocks.projectFindFirst,
    },
    compilation: {
      create: mocks.compilationCreate,
    },
  },
}));

vi.mock('@/lib/minio', () => ({
  ensureBucket: vi.fn(),
  getBucket: () => 'bucket',
  minioClient: {
    putObject: vi.fn(),
  },
}));

vi.mock('@/services/file-service', () => ({
  getFileContent: vi.fn(),
}));

import { triggerCompilation } from '@/services/compilation-service';

describe('triggerCompilation queue priority', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.compilationCreate.mockResolvedValue({
      id: 'compile-1',
      projectId: 'project-1',
      userId: 'free-collaborator',
      status: 'queued',
      compiler: 'pdflatex',
    });
  });

  it('uses the project owner plan for BullMQ priority', async () => {
    mocks.projectFindFirst.mockResolvedValue({
      id: 'project-1',
      mainFile: 'main.tex',
      compiler: 'pdflatex',
      files: [
        {
          path: 'main.tex',
          minioKey: 'projects/project-1/files/main.tex',
          content: '\\documentclass{article}',
          isBinary: false,
        },
      ],
      members: [
        {
          user: {
            settings: { billingPlan: 'team' },
            storageQuotaBytes: BigInt(0),
          },
        },
      ],
    });

    await triggerCompilation('project-1', 'free-collaborator');

    expect(mocks.queueAdd).toHaveBeenCalledWith(
      'compile',
      expect.objectContaining({
        compilationId: 'compile-1',
        projectId: 'project-1',
      }),
      expect.objectContaining({ priority: 1 }),
    );
  });

  it('falls back to standard priority when the owner cannot be resolved', async () => {
    mocks.projectFindFirst.mockResolvedValue({
      id: 'project-1',
      mainFile: 'main.tex',
      compiler: 'pdflatex',
      files: [{ path: 'main.tex', minioKey: null, content: 'x', isBinary: false }],
      members: [],
    });

    await triggerCompilation('project-1', 'requester-1');

    expect(mocks.queueAdd).toHaveBeenCalledWith(
      'compile',
      expect.any(Object),
      expect.objectContaining({ priority: 5 }),
    );
  });
});
